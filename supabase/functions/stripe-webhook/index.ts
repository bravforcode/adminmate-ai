import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { captureError } from '../_shared/sentry.ts'
import { getCorsHeaders } from '../_shared/utils.ts'

// Stripe webhook signature verification using HMAC-SHA256
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return false

  // Parse the Stripe signature header: t=timestamp,v1=signature[,v1=...]
  const parts = signature.split(',')
  const timestampPart = parts.find(p => p.startsWith('t='))
  const signatureParts = parts.filter(p => p.startsWith('v1='))

  if (!timestampPart || signatureParts.length === 0) return false

  const timestamp = timestampPart.slice(2)
  const signedPayload = `${timestamp}.${payload}`

  // Compute HMAC-SHA256
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Compare signatures (constant-time comparison to prevent timing attacks)
  return signatureParts.some(v1 => {
    const sig = v1.slice(3)
    if (sig.length !== computedSignature.length) return false
    let result = 0
    for (let i = 0; i < sig.length; i++) {
      result |= sig.charCodeAt(i) ^ computedSignature.charCodeAt(i)
    }
    return result === 0
  })
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!

    // SECURITY: Pin Stripe API version in Stripe Dashboard → Developers → Webhooks
    // Current code expects: subscription_details (checkout.session.completed)
    // API version must be >= 2024-11-20.acacia for this field to exist.
    // If webhook breaks after Stripe upgrade, check: https://stripe.com/docs/upgrades

    // Get raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get("stripe-signature") || ""

    // Verify signature
    if (!await verifyStripeSignature(body, signature, stripeWebhookSecret)) {
      return new Response("Invalid signature", { status: 400 })
    }

    const event = JSON.parse(body)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check for duplicate event
    const { data: existingEvent } = await supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .single()

    if (existingEvent) {
      return new Response("Duplicate event", { status: 200 })
    }

    // Log the event
    await supabase.from("stripe_webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event,
      processed_at: new Date().toISOString(),
    })

    // Handle event
    const companyId = event.data?.object?.metadata?.company_id
    if (!companyId) {
      return new Response("No company_id in metadata", { status: 200 })
    }

    // Type guard: ensure event.data.object exists
    if (!event.data?.object) {
      return new Response("Invalid event data", { status: 200 })
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        // subscription_details may not exist in older API versions
        const periodEnd = session.subscription_details?.current_period_end
          ? new Date(session.subscription_details.current_period_end * 1000).toISOString()
          : null
        await supabase
          .from("companies")
          .update({
            stripe_subscription_id: session.subscription,
            subscription_status: "active",
            ...(periodEnd && { subscription_current_period_end: periodEnd }),
          })
          .eq("id", companyId)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object
        const status = subscription.status
        await supabase
          .from("companies")
          .update({
            subscription_status: status,
            subscription_current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            subscription_cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq("id", companyId)
        break
      }

      case "customer.subscription.deleted": {
        await supabase
          .from("companies")
          .update({
            subscription_status: "canceled",
            stripe_subscription_id: null,
          })
          .eq("id", companyId)
        break
      }

      case "invoice.payment_failed": {
        await supabase
          .from("companies")
          .update({ subscription_status: "past_due" })
          .eq("id", companyId)
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object
        if (invoice.billing_reason === "subscription_create") {
          await supabase
            .from("companies")
            .update({ subscription_status: "active" })
            .eq("id", companyId)
        }
        break
      }

      default:
        // Unhandled event type
        break
    }

    return new Response("OK", { status: 200 })
  } catch (error) {
    captureError(error, { function: 'stripe-webhook' })
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    })
  }
})
