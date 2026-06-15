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
import { hashBackupCode, hashBackupCodes } from './crypto.ts'

const FN = 'verify-mfa'

export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    const code = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }
  return codes
}

export async function handleRequest(req: Request): Promise<Response> {

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

    // Rate limit: 10 per minute
    const rateLimited = await enforceRateLimit(supabase, user.id, 'verify_mfa', 10, 60, req)
    if (rateLimited) return rateLimited

    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON body' }),
        { status: 400, headers: getJsonHeaders(req) }
      )
    }

    const { factor_id, code } = body
    if (!factor_id || typeof factor_id !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'factor_id is required' }),
        { status: 400, headers: getJsonHeaders(req) }
      )
    }
    if (!code || typeof code !== 'string' || code.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valid verification code is required' }),
        { status: 400, headers: getJsonHeaders(req) }
      )
    }

    // Verify the TOTP code via Supabase admin API
    const { data: challengeData, error: challengeError } =
      await supabase.auth.admin.verifyFactorLogin(user.id, factor_id, code)

    if (challengeError || !challengeData) {
      // TOTP failed — try backup code verification
      const { data: enrollment } = await supabase
        .from('mfa_enrollments')
        .select('backup_codes')
        .eq('user_id', user.id)
        .eq('factor_id', factor_id)
        .maybeSingle()

      if (enrollment?.backup_codes) {
        const storedHashes: string[] = JSON.parse(enrollment.backup_codes)
        const inputHash = await hashBackupCode(code)
        const matchedIndex = storedHashes.indexOf(inputHash)

        if (matchedIndex !== -1) {
          storedHashes.splice(matchedIndex, 1)

          await supabase
            .from('mfa_enrollments')
            .update({
              backup_codes: JSON.stringify(storedHashes),
            })
            .eq('user_id', user.id)
            .eq('factor_id', factor_id)

          logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })

          return new Response(
            JSON.stringify({
              success: true,
              data: { verified: true, backup_code_used: true },
            }),
            { headers: getJsonHeaders(req) }
          )
        }
      }

      logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 401, error: 'Invalid code' })
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid verification code' }),
        { status: 401, headers: getJsonHeaders(req) }
      )
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes()
    const hashedBackupCodes = await hashBackupCodes(backupCodes)

    // Update enrollment record
    const { error: updateError } = await supabase
      .from('mfa_enrollments')
      .update({
        verified_at: new Date().toISOString(),
        is_active: true,
        backup_codes: JSON.stringify(hashedBackupCodes),
      })
      .eq('user_id', user.id)
      .eq('factor_id', factor_id)

    if (updateError) {
      console.error('Failed to update enrollment:', updateError)
    }

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'mfa_enabled',
        resource_type: 'mfa_enrollment',
        resource_id: factor_id,
        details: JSON.stringify({ method: 'totp' }),
      })
    } catch {
      // Non-critical, continue
    }

    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          verified: true,
          backup_codes: backupCodes,
        },
      }),
      { headers: getJsonHeaders(req) }
    )
  } catch (error: any) {
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: error?.message })
    return errorResponse(error, 500, getJsonHeaders(req))
  }
}

serve(handleRequest)

