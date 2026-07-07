import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { getServiceClient } from '../_shared/supabaseClient.ts'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/utils.ts'

serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const cors = getCorsHeaders(req)
  const url = new URL(req.url)
  const isInternal = req.headers.get("X-Health-Check-Key") === Deno.env.get("HEALTH_CHECK_KEY")

  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {}
  const startTime = Date.now()

  // Check 1: Supabase database
  try {
    const dbStart = Date.now()
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!supabaseUrl || !supabaseKey) {
      checks.database = { status: "error", error: "Missing env vars" }
    } else {
      const supabase = getServiceClient()
      const { error } = await supabase.from("companies").select("id").limit(1)
      checks.database = {
        status: error ? "error" : "ok",
        latencyMs: Date.now() - dbStart,
        // Only expose error details internally
        error: error ? (isInternal ? error.message : "Connection failed") : undefined,
      }
    }
  } catch {
    checks.database = { status: "error", error: isInternal ? "Database unreachable" : "Service unavailable" }
  }

  // Check 2: Stripe API (if configured)
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")
  if (stripeKey) {
    try {
      const stripeStart = Date.now()
      const res = await fetch("https://api.stripe.com/v1/balance", {
        headers: { Authorization: `Bearer ${stripeKey}` },
      })
      checks.stripe = {
        status: res.ok ? "ok" : "error",
        latencyMs: Date.now() - stripeStart,
        error: res.ok ? undefined : (isInternal ? `HTTP ${res.status}` : "Service unavailable"),
      }
    } catch {
      checks.stripe = { status: "error", error: isInternal ? "Stripe unreachable" : "Service unavailable" }
    }
  } else {
    // Don't expose "STRIPE_SECRET_KEY not configured" publicly
    checks.stripe = { status: "skipped" }
  }

  // Check 3: Gemini API (if configured)
  const geminiKey = Deno.env.get("GEMINI_API_KEY")
  if (geminiKey) {
    try {
      const geminiStart = Date.now()
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`
      )
      checks.gemini = {
        status: res.ok ? "ok" : "error",
        latencyMs: Date.now() - geminiStart,
        error: res.ok ? undefined : (isInternal ? `HTTP ${res.status}` : "Service unavailable"),
      }
    } catch {
      checks.gemini = { status: "error", error: isInternal ? "Gemini unreachable" : "Service unavailable" }
    }
  } else {
    checks.gemini = { status: "skipped" }
  }

  const totalLatency = Date.now() - startTime
  const allOk = Object.values(checks).every(c => c.status === "ok" || c.status === "skipped")

  // Public response: minimal, no internal details
  const publicResponse = {
    status: allOk ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
  }

  // Internal response: full details
  const internalResponse = {
    ...publicResponse,
    latencyMs: totalLatency,
    checks,
  }

  return new Response(
    JSON.stringify(isInternal ? internalResponse : publicResponse),
    {
      status: allOk ? 200 : 503,
      headers: { ...cors, "Content-Type": "application/json" },
    }
  )
})
