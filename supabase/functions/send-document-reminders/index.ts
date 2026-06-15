import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getCorsHeaders,
  getJsonHeaders,
  handleCorsPreflight,
  verifyAuth,
  enforceRateLimit,
  logRequest,
} from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

const FN = 'send-document-reminders'
const MAX_BATCH = 500

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const start = Date.now()
  let userId: string | undefined
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: getJsonHeaders(req) })
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const authHeader = req.headers.get('Authorization')
    const cronSecret = req.headers.get('x-cron-secret')

    let authorized = false
    if (cronSecret && cronSecret === Deno.env.get('CRON_SECRET_KEY')) {
      authorized = true
    } else if (authHeader?.startsWith('Bearer ')) {
      const user = await verifyAuth(req, supabase)
      if (user) {
        userId = user.id
        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
        authorized = !!profile && ['admin', 'hr'].includes(profile.role)
      }
    }
    if (!authorized) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: getJsonHeaders(req) })
    }

    if (!cronSecret) {
      const rateLimited = await enforceRateLimit(supabase, userId || 'anon', 'document_reminders', 5, 60)
      if (rateLimited) return rateLimited
    }

    let body: any = {}
    try { body = await req.json() } catch { body = {} }

    const { docId } = body
    if (docId !== undefined && (typeof docId !== 'string' || docId.length > 128)) {
      return new Response(JSON.stringify({ success: false, error: 'docId must be a string' }), { status: 400, headers: getJsonHeaders(req) })
    }

    let processed = 0
    const nowIso = new Date().toISOString()

    if (docId) {
      const { data: doc } = await supabase.from('documents').select('*').eq('id', docId).single()
      if (!doc) {
        return new Response(JSON.stringify({ success: false, error: 'Document not found' }), { status: 404, headers: getJsonHeaders(req) })
      }
      await supabase
        .from('documents')
        .update({ last_reminder_at: nowIso, reminder_count: (doc.reminder_count || 0) + 1 })
        .eq('id', docId)
      if (doc.employee_id || doc.candidate_id) {
        await supabase.from('notifications').insert({
          user_id: doc.employee_id || doc.candidate_id,
          company_id: doc.company_id,
          title: `Document Pending: ${doc.name}`,
          message: `Please complete or submit your ${doc.name} document. Due: ${doc.due_date || 'ASAP'}`,
          notification_type: 'document_reminder',
          reference_type: 'document',
          reference_id: docId,
        })
        processed = 1
      }
    } else {
      const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      const { data: pendingDocs } = await supabase
        .from('documents')
        .select('*')
        .in('status', ['draft', 'pending_signature'])
        .eq('reminder_enabled', true)
        .or(`last_reminder_at.is.null,last_reminder_at.lt.${cutoff}`)
        .limit(MAX_BATCH)

      for (const doc of pendingDocs || []) {
        await supabase
          .from('documents')
          .update({ last_reminder_at: nowIso, reminder_count: (doc.reminder_count || 0) + 1 })
          .eq('id', doc.id)
        if (doc.employee_id || doc.candidate_id) {
          await supabase.from('notifications').insert({
            user_id: doc.employee_id || doc.candidate_id,
            company_id: doc.company_id,
            title: `Reminder: ${doc.name}`,
            message: `Document "${doc.name}" is pending. Please submit.`,
            notification_type: 'document_reminder',
            reference_type: 'document',
            reference_id: doc.id,
          })
          processed++
        }
      }
    }

    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 200 })
    return new Response(JSON.stringify({ success: true, processed }), { headers: getJsonHeaders(req) })
  } catch (error: any) {
    logRequest({ function: FN, userId, durationMs: Date.now() - start, status: 500, error: error?.message })
    return errorResponse(error, 500, getCorsHeaders(req))
  }
})
