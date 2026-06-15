import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getJsonHeaders,
  handleCorsPreflight,
  verifyAuth,
  enforceRateLimit,
  logRequest,
} from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

const FN = 'setup-mfa'

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const start = Date.now()
  let userId: string | undefined
  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: getJsonHeaders(req) }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const user = await verifyAuth(req, supabase)
    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: getJsonHeaders(req) }
      )
    }
    userId = user.id

    // Rate limit: 5 per minute
    const rateLimited = await enforceRateLimit(supabase, user.id, 'setup_mfa', 5, 60, req)
    if (rateLimited) return rateLimited

    // Check if user already has an active MFA enrollment
    const { data: existing } = await supabase
      .from('mfa_enrollments')
      .select('id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({ success: false, error: 'MFA is already enabled on this account' }),
        { status: 409, headers: getJsonHeaders(req) }
      )
    }

    // Use Supabase's built-in MFA enrollment via admin API
    // First, check if there's already a pending TOTP factor
    const { data: factors, error: listError } = await supabase.auth.admin.listFactors(user.id)
    if (listError) {
      console.error('Failed to list factors:', listError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to check existing factors' }),
        { status: 500, headers: getJsonHeaders(req) }
      )
    }

    const totpFactors = factors?.totp ?? []
    const pendingFactor = totpFactors.find((f: { status: string }) => f.status === 'unverified')

    if (pendingFactor) {
      // Return the existing pending factor's QR URI
      const { data: enrollData } = await supabase.auth.admin.generateTOTP(pendingFactor.id)
      logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            factor_id: pendingFactor.id,
            totp_uri: pendingFactor.totp?.uri || enrollData?.totp_uri || '',
          },
        }),
        { headers: getJsonHeaders(req) }
      )
    }

    // Create a new TOTP factor
    const { data: factorData, error: factorError } = await supabase.auth.admin.enrollFactor(
      user.id,
      {
        factorType: 'totp',
        friendlyName: 'AdminMate Authenticator',
      }
    )

    if (factorError) {
      console.error('Failed to enroll factor:', factorError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create MFA factor' }),
        { status: 500, headers: getJsonHeaders(req) }
      )
    }

    // Create enrollment record
    const { error: insertError } = await supabase
      .from('mfa_enrollments')
      .insert({
        user_id: user.id,
        factor_id: factorData?.id,
        enrolled_at: new Date().toISOString(),
        is_active: false,
      })

    if (insertError) {
      console.error('Failed to create enrollment record:', insertError)
    }

    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          factor_id: factorData?.id,
          totp_uri: factorData?.totp?.uri || '',
        },
      }),
      { headers: getJsonHeaders(req) }
    )
  } catch (error: any) {
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: error?.message })
    return errorResponse(error, 500, getJsonHeaders(req))
  }
})
