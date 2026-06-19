import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { captureError } from '../_shared/sentry.ts'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!
    const appUrl = Deno.env.get("APP_URL") || "https://adminmate-ai.vercel.app"

    // Get auth user
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Get company
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("company_id")
      .eq("id", user.id)
      .single()

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "No company found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", profile.company_id)
      .single()

    // Parse request body
    const { priceId, trialPeriodDays = 14 } = await req.json()

    if (!priceId) {
      return new Response(JSON.stringify({ error: "Missing priceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Validate priceId format (Stripe price IDs start with "price_")
    if (!priceId.startsWith("price_")) {
      return new Response(JSON.stringify({ error: "Invalid priceId format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Validate trial period (max 30 days)
    if (trialPeriodDays < 0 || trialPeriodDays > 30) {
      return new Response(JSON.stringify({ error: "Invalid trialPeriodDays (0-30)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
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
        console.error('Stripe customer creation failed:', customer.error.message)
        return new Response(JSON.stringify({ error: 'Failed to create customer. Please try again.' }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
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
      console.error('Stripe checkout session failed:', session.error.message)
      return new Response(JSON.stringify({ error: 'Failed to create checkout session. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    captureError(error, { function: 'stripe-checkout' })
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
