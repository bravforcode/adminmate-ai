import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getCorsHeaders,
  handleCorsPreflight,
  enforceRateLimit,
  logRequest,
} from '../_shared/utils.ts'
import { errorResponse } from '../_shared/errorHandler.ts'

const FN = 'generate-scheduled-reports'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

serve(async (req) => {
  const preflight = handleCorsPreflight(req)
  if (preflight) return preflight

  const start = Date.now()
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405, headers: getCorsHeaders(req) })
    }

    const cronSecret = req.headers.get('x-cron-secret')
    const expectedSecret = Deno.env.get('CRON_SECRET')
    if (!cronSecret || cronSecret !== expectedSecret) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid cron secret' }), { status: 401, headers: getCorsHeaders(req) })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = new Date().toISOString()

    const { data: schedules, error: schedError } = await supabase
      .from('report_schedules')
      .select('*')
      .eq('is_enabled', true)
      .lte('next_run_at', now)
      .limit(10)

    if (schedError) throw schedError

    if (!schedules || schedules.length === 0) {
      logRequest({ function: FN, durationMs: Date.now() - start, status: 200 })
      return new Response(
        JSON.stringify({ success: true, data: { processed: 0 } }),
        { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      )
    }

    const results: Array<{ schedule_id: string; report_type: string; status: string }> = []

    for (const schedule of schedules) {
      try {
        const dateRange = getDateRange(schedule.frequency)
        const generator = getGenerator(schedule.report_type)
        const { html, title } = await generator(supabase, schedule.company_id, dateRange)

        const { error: insertError } = await supabase
          .from('generated_reports')
          .insert({
            company_id: schedule.company_id,
            schedule_id: schedule.id,
            report_type: schedule.report_type,
            title,
            content: html,
            format: 'html',
            date_from: dateRange.start,
            date_to: dateRange.end,
          })

        if (insertError) throw insertError

        const nextRun = computeNextRun(schedule.frequency)
        const { error: updateError } = await supabase
          .from('report_schedules')
          .update({ last_run_at: now, next_run_at: nextRun, updated_at: now })
          .eq('id', schedule.id)

        if (updateError) throw updateError

        if (schedule.recipients && schedule.recipients.length > 0) {
          for (const recipientId of schedule.recipients) {
            await supabase.from('notifications').insert({
              user_id: recipientId,
              company_id: schedule.company_id,
              notification_type: 'system',
              title: `Report Ready: ${title}`,
              message: `Your ${schedule.frequency} ${schedule.report_type.replace(/_/g, ' ')} report has been generated.`,
              action_url: '/reports',
            })
          }
        }

        results.push({ schedule_id: schedule.id, report_type: schedule.report_type, status: 'success' })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`Failed to generate report for schedule ${schedule.id}:`, message)
        results.push({ schedule_id: schedule.id, report_type: schedule.report_type, status: 'error' })
      }
    }

    logRequest({ function: FN, durationMs: Date.now() - start, status: 200 })
    return new Response(
      JSON.stringify({ success: true, data: { processed: results.length, results } }),
      { status: 200, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    logRequest({ function: FN, durationMs: Date.now() - start, status: 500, error: error instanceof Error ? error.message : String(error) })
    return errorResponse(error, 500, getCorsHeaders(req))
  }
})

function getDateRange(frequency: string): { start: string; end: string } {
  const now = new Date()
  const end = now.toISOString()
  let start: Date

  if (frequency === 'daily') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  } else if (frequency === 'weekly') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
  } else {
    start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  }

  return { start: start.toISOString(), end }
}

function computeNextRun(frequency: string): string {
  const now = new Date()
  if (frequency === 'daily') {
    now.setDate(now.getDate() + 1)
    now.setHours(8, 0, 0, 0)
  } else if (frequency === 'weekly') {
    now.setDate(now.getDate() + 7)
    now.setHours(8, 0, 0, 0)
  } else {
    now.setMonth(now.getMonth() + 1)
    now.setHours(8, 0, 0, 0)
  }
  return now.toISOString()
}

type GeneratorFn = (supabase: ReturnType<typeof createClient>, companyId: string, dateRange: { start: string; end: string }) => Promise<{ html: string; title: string }>

function getGenerator(reportType: string): GeneratorFn {
  const generators: Record<string, GeneratorFn> = {
    hiring_summary: async (sb, cid, dr) => generateHiringSummary(sb, cid, dr),
    pipeline_analysis: async (sb, cid, dr) => generatePipelineAnalysis(sb, cid, dr),
    time_to_hire: async (sb, cid, dr) => generateTimeToHire(sb, cid, dr),
    source_effectiveness: async (sb, cid, dr) => generateSourceEffectiveness(sb, cid, dr),
    onboarding_progress: async (sb, cid, dr) => generateOnboardingProgress(sb, cid, dr),
  }
  return generators[reportType] || generators.hiring_summary
}

function buildHTML(title: string, sections: Array<{ title: string; content: string }>, dateRange: { start: string; end: string }): string {
  const dateFrom = new Date(dateRange.start).toLocaleDateString()
  const dateTo = new Date(dateRange.end).toLocaleDateString()
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>${title}</title><style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:24px}h1{border-bottom:2px solid #003d9a;padding-bottom:8px}h2{color:#003d9a;margin-top:24px}.meta{color:#64748b;font-size:14px;margin-bottom:24px}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #e2e8f0}th{background:#f1f5f9;font-weight:600}.kpi{display:inline-block;background:#f1f5f9;border-radius:8px;padding:12px 16px;margin:4px;min-width:140px}.kpi .value{font-size:28px;font-weight:700;color:#003d9a}.kpi .label{font-size:12px;color:#64748b;margin-top:4px}.bar{height:16px;background:#e2e8f0;border-radius:4px;overflow:hidden;margin:4px 0}.bar-fill{height:100%;background:#003d9a;border-radius:4px}.section{margin-bottom:24px}</style></head><body><h1>${title}</h1><p class="meta">Period: ${dateFrom} – ${dateTo} | Generated: ${new Date().toLocaleString()}</p>${sections.map(s => `<div class="section"><h2>${s.title}</h2>${s.content}</div>`).join('')}<p style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">Generated by AdminMate AI</p></body></html>`
}

function kpiBox(value: string, label: string): string {
  return `<div class="kpi"><div class="value">${value}</div><div class="label">${label}</div></div>`
}

async function generateHiringSummary(sb: ReturnType<typeof createClient>, companyId: string, dateRange: { start: string; end: string }) {
  const [appsRes, hiredRes] = await Promise.all([
    sb.from('applications').select('id, status', { count: 'exact' }).eq('company_id', companyId).gte('created_at', dateRange.start).lte('created_at', dateRange.end),
    sb.from('applications').select('id').eq('company_id', companyId).eq('status', 'hired').gte('created_at', dateRange.start).lte('created_at', dateRange.end),
  ])
  const totalApps = appsRes.count || 0
  const hiredCount = hiredRes.count || 0
  const conversionRate = totalApps > 0 ? Math.round((hiredCount / totalApps) * 100) : 0

  const sections = [{
    title: 'Key Metrics',
    content: `<div>${kpiBox(String(totalApps), 'Applications')}${kpiBox(String(hiredCount), 'Hired')}${kpiBox(`${conversionRate}%`, 'Conversion')}</div>`,
  }]
  return { html: buildHTML('Hiring Summary Report', sections, dateRange), title: 'Hiring Summary Report' }
}

async function generatePipelineAnalysis(sb: ReturnType<typeof createClient>, companyId: string, dateRange: { start: string; end: string }) {
  const { data } = await sb.rpc('get_pipeline_counts', { p_company_id: companyId })
  const pipeline = (data || {}) as Record<string, number>
  const stages = ['applied', 'ai_screening', 'shortlisted', 'interviewing', 'offered', 'hired', 'rejected']
  const maxVal = Math.max(...Object.values(pipeline).map(Number), 1)

  const rows = stages.map(s => {
    const val = pipeline[s] || 0
    const pct = Math.round((val / maxVal) * 100)
    return `<tr><td>${s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</td><td><div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div></td><td style="text-align:right;font-weight:600">${val}</td></tr>`
  }).join('')

  const sections = [{ title: 'Pipeline Funnel', content: `<table><thead><tr><th>Stage</th><th style="width:60%">Volume</th><th style="text-align:right">Count</th></tr></thead><tbody>${rows}</tbody></table>` }]
  return { html: buildHTML('Pipeline Analysis Report', sections, dateRange), title: 'Pipeline Analysis Report' }
}

async function generateTimeToHire(sb: ReturnType<typeof createClient>, companyId: string, dateRange: { start: string; end: string }) {
  const { data: hired } = await sb.from('applications').select('created_at, updated_at').eq('company_id', companyId).eq('status', 'hired').gte('created_at', dateRange.start).lte('created_at', dateRange.end)
  const apps = (hired || []) as Array<{ created_at: string; updated_at: string }>
  const daysList = apps.map(a => Math.round((new Date(a.updated_at).getTime() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24)))
  const avgDays = daysList.length > 0 ? Math.round(daysList.reduce((s, d) => s + d, 0) / daysList.length) : 0

  const sections = [{ title: 'Time-to-Hire', content: `<div>${kpiBox(`${avgDays}d`, 'Average')}${kpiBox(String(daysList.length), 'Total Hires')}</div>` }]
  return { html: buildHTML('Time-to-Hire Report', sections, dateRange), title: 'Time-to-Hire Report' }
}

async function generateSourceEffectiveness(sb: ReturnType<typeof createClient>, companyId: string, dateRange: { start: string; end: string }) {
  const { data: candidates } = await sb.from('candidates').select('source').eq('company_id', companyId).gte('created_at', dateRange.start).lte('created_at', dateRange.end)
  const sourceCounts: Record<string, number> = {}
  ;(candidates || []).forEach((c: { source?: string }) => { const s = c.source || 'Other'; sourceCounts[s] = (sourceCounts[s] || 0) + 1 })
  const total = Object.values(sourceCounts).reduce((a, b) => a + b, 0) || 1
  const maxCount = Math.max(...Object.values(sourceCounts), 1)

  const rows = Object.entries(sourceCounts).sort(([, a], [, b]) => b - a).map(([source, count]) => {
    const pct = Math.round((count / maxCount) * 100)
    return `<tr><td>${escapeHtml(source)}</td><td><div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div></td><td style="text-align:right">${count} (${Math.round((count / total) * 100)}%)</td></tr>`
  }).join('')

  const sections = [{ title: 'Source Breakdown', content: `<table><thead><tr><th>Source</th><th style="width:50%">Volume</th><th style="text-align:right">Candidates</th></tr></thead><tbody>${rows}</tbody></table>` }]
  return { html: buildHTML('Source Effectiveness Report', sections, dateRange), title: 'Source Effectiveness Report' }
}

async function generateOnboardingProgress(sb: ReturnType<typeof createClient>, companyId: string, dateRange: { start: string; end: string }) {
  const { data: checklists } = await sb.from('onboarding_checklists').select('status, progress_percentage').eq('company_id', companyId).gte('created_at', dateRange.start).lte('created_at', dateRange.end)
  const lists = (checklists || []) as Array<{ status: string; progress_percentage: number }>
  const total = lists.length
  const completed = lists.filter(l => l.status === 'completed').length
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const sections = [{ title: 'Onboarding Metrics', content: `<div>${kpiBox(String(total), 'Total')}${kpiBox(`${completionRate}%`, 'Completion')}</div>` }]
  return { html: buildHTML('Onboarding Progress Report', sections, dateRange), title: 'Onboarding Progress Report' }
}
