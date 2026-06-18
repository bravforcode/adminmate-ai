// ============================================================
// AdminMate AI — Subscription Limit Checker (Edge Function)
// Server-side enforcement for Free/Growth/Pro tier limits
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

export interface LimitResult {
  allowed: boolean
  current: number
  limit: number
  feature: string
  tier: string
  upgradeRequired: boolean
}

// Monthly numeric limits per tier
const MONTHLY_LIMITS: Record<string, Record<string, number>> = {
  free: {
    ai_messages: 10,
  },
  growth: {
    ai_messages: 100,
  },
  pro: {
    ai_messages: 999999,
  },
}

// Count-based limits per tier (total, not monthly)
const COUNT_LIMITS: Record<string, Record<string, number>> = {
  free: {
    jobs: 1,
    candidates: 5,
    hr_users: 1,
  },
  growth: {
    jobs: 10,
    candidates: 100,
    hr_users: 5,
  },
  pro: {
    jobs: 999999,
    candidates: 999999,
    hr_users: 20,
  },
}

// Features that are boolean (not numeric limits)
const BOOLEAN_FEATURES: Record<string, Record<string, boolean>> = {
  free: {
    document_signing: false,
    pdpa_tools: false,
    bulk_import: false,
    custom_reports: false,
  },
  growth: {
    document_signing: true,
    pdpa_tools: true,
    bulk_import: false,
    custom_reports: false,
  },
  pro: {
    document_signing: true,
    pdpa_tools: true,
    bulk_import: true,
    custom_reports: true,
  },
}

/**
 * Get the subscription tier for a company.
 */
export async function getCompanyTier(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<string> {
  const { data } = await supabase
    .from("companies")
    .select("subscription_tier")
    .eq("id", companyId)
    .single()
  return data?.subscription_tier || "free"
}

/**
 * Check monthly AI message limit for the company's tier.
 * Returns true if within limit, false if exceeded.
 */
export async function checkAIMonthlyLimit(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<LimitResult> {
  const tier = await getCompanyTier(supabase, companyId)
  const limit = (MONTHLY_LIMITS[tier] || MONTHLY_LIMITS.free).ai_messages

  // Count messages from current month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const { count } = await supabase
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("role", "user")
    .gte("created_at", monthStart)

  const current = count || 0
  return {
    allowed: current < limit,
    current,
    limit,
    feature: "ai_messages",
    tier,
    upgradeRequired: current >= limit,
  }
}

/**
 * Check count-based limit (jobs, candidates, hr_users).
 */
export async function checkCountLimit(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  feature: string
): Promise<LimitResult> {
  const tier = await getCompanyTier(supabase, companyId)
  const limit = (COUNT_LIMITS[tier] || COUNT_LIMITS.free)[feature]

  if (limit === undefined) {
    return {
      allowed: true,
      current: 0,
      limit: Infinity,
      feature,
      tier,
      upgradeRequired: false,
    }
  }

  let current = 0
  switch (feature) {
    case "jobs": {
      const { count } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
      current = count || 0
      break
    }
    case "candidates": {
      const { count } = await supabase
        .from("candidates")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
      current = count || 0
      break
    }
    case "hr_users": {
      const { count } = await supabase
        .from("user_profiles")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .in("role", ["admin", "hr", "manager"])
      current = count || 0
      break
    }
  }

  return {
    allowed: current < limit,
    current,
    limit,
    feature,
    tier,
    upgradeRequired: current >= limit,
  }
}

/**
 * Check boolean feature access.
 */
export function checkFeatureAccess(
  tier: string,
  feature: string
): { allowed: boolean; upgradeRequired: boolean } {
  const tierFeatures = BOOLEAN_FEATURES[tier] || BOOLEAN_FEATURES.free
  if (!(feature in tierFeatures)) {
    return { allowed: true, upgradeRequired: false }
  }
  const allowed = tierFeatures[feature]
  return { allowed, upgradeRequired: !allowed }
}

/**
 * Build a 403 response for limit exceeded.
 */
export function limitExceededResponse(result: LimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Subscription limit exceeded",
      feature: result.feature,
      current: result.current,
      limit: result.limit,
      tier: result.tier,
      upgradeRequired: result.upgradeRequired,
      message: `You've reached the ${result.feature} limit for the ${result.tier} plan. Upgrade to continue.`,
    }),
    {
      status: 403,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    }
  )
}
