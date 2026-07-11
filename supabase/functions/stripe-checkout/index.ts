import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { getServiceClient } from '../_shared/supabaseClient.ts'
import { captureError } from '../_shared/sentry.ts'
import { getCorsHeaders } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

serve(async (req: Request) => {
  const cors = getCorsHeaders(req)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors })
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!
    const appUrl = Deno.env.get("APP_URL") || "https://adminmate-ai.vercel.app"

    // Get auth user
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return errorResponse("Missing authorization", 401, cors)
    }

    const supabase = getServiceClient()
    // Override the global Authorization header for user-context queries
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "").trim()
    )
    if (authError || !user) {
      return errorResponse("Unauthorized", 401, cors)
    }

    // Get company
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("company_id")
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) {
      return errorResponse("No company found", 400, cors)
    }

    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", profile.company_id)
      .single()

    // Parse request body
    const { priceId, trialPeriodDays = 14 } = await req.json()

    if (!priceId) {
      return errorResponse("Missing priceId", 400, cors)
    }

    // Validate priceId format (Stripe price IDs start with "price_")
    if (!priceId.startsWith("price_")) {
      return errorResponse("Invalid priceId format", 400, cors)
    }

    // Validate trial period (max 30 days)
    if (trialPeriodDays < 0 || trialPeriodDays > 30) {
      return errorResponse("Invalid trialPeriodDays (0-30)", 400, cors)
    }

    // Create or retrieve Stripe customer
    let customerId = company?.stripe_customer_id

    if (!customerId) {
      const customerRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          email: user.email || "",
          name: company?.name || "",
          "metadata[company_id]": profile.company_id,
          "metadata[user_id]": user.id,
        }).toString(),
      })

      const customer = await customerRes.json()
      if (customer.error) {
        // SECURITY: Sanitize Stripe error before logging — never log full error details
        console.error('Stripe customer creation failed:', customer.error.type || 'unknown')
        return errorResponse('Failed to create customer. Please try again.', 500, cors)
      }

      customerId = customer.id

      // Save customer ID
      await supabase
        .from("companies")
        .update({ stripe_customer_id: customerId })
        .eq("id", profile.company_id)
    }

    // Create checkout session
    const sessionRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId,
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        mode: "subscription",
        "subscription_data[trial_period_days]": String(trialPeriodDays),
        "subscription_data[metadata][company_id]": profile.company_id,
        "subscription_data[metadata][user_id]": user.id,
        success_url: `${appUrl}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/settings/billing`,
        "metadata[company_id]": profile.company_id,
        "metadata[user_id]": user.id,
      }).toString(),
    })

    const session = await sessionRes.json()
    if (session.error) {
      // SECURITY: Sanitize Stripe error before logging — never log full error details
      console.error('Stripe checkout session failed:', session.error.type || 'unknown')
      return errorResponse('Failed to create checkout session. Please try again.', 500, cors)
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (error) {
    captureError(error, { function: 'stripe-checkout' })
    return errorResponse(error, 500, cors)
  }
})
