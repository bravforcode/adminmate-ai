import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, verifyAuth } from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const authHeader = req.headers.get('Authorization')
    const cronSecret = req.headers.get('x-cron-secret')
    let authorized = false
    if (cronSecret && cronSecret === Deno.env.get('CRON_SECRET_KEY')) {
      authorized = true
    } else if (authHeader?.startsWith('Bearer ')) {
      const user = await verifyAuth(req, supabase)
      if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
        authorized = !!profile && ['admin', 'hr'].includes(profile.role)
      }
    }
    if (!authorized) return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    const { docId } = await req.json()

    if (docId) {
      const { data: doc } = await supabase.from('documents').select('*').eq('id', docId).single()
      if (doc) {
        await supabase.from('documents').update({ last_reminder_at: new Date().toISOString(), reminder_count: (doc.reminder_count || 0) + 1 }).eq('id', docId)
        if (doc.employee_id || doc.candidate_id) {
          await supabase.from('notifications').insert({
            user_id: doc.employee_id || doc.candidate_id, company_id: doc.company_id,
            title: `Document Pending: ${doc.name}`, message: `Please complete or submit your ${doc.name} document. Due: ${doc.due_date || 'ASAP'}`,
            notification_type: 'document_reminder', reference_type: 'document', reference_id: docId,
          })
        }
      }
    } else {
      const { data: pendingDocs } = await supabase.from('documents').select('*').in('status', ['draft', 'pending_signature']).eq('reminder_enabled', true).or('last_reminder_at.is.null,last_reminder_at.lt.\'' + new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() + '\'')
      for (const doc of pendingDocs || []) {
        await supabase.from('documents').update({ last_reminder_at: new Date().toISOString(), reminder_count: (doc.reminder_count || 0) + 1 }).eq('id', doc.id)
        if (doc.employee_id || doc.candidate_id) {
          await supabase.from('notifications').insert({ user_id: doc.employee_id || doc.candidate_id, company_id: doc.company_id, title: `Reminder: ${doc.name}`, message: `Document "${doc.name}" is pending. Please submit.`, notification_type: 'document_reminder', reference_type: 'document', reference_id: doc.id })
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return errorResponse(error, 500, corsHeaders)
  }
})
