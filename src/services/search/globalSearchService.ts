import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

const SENSITIVE_FIELDS = ['salary', 'ssn', 'national_id', 'bank_account', 'health_info']

function stripSensitive(text: string): string {
  let cleaned = text
  for (const field of SENSITIVE_FIELDS) {
    const re = new RegExp(`${field}\\s*[:=]\\s*\\S+`, 'gi')
    cleaned = cleaned.replace(re, `${field}: [REDACTED]`)
  }
  return cleaned
}

export interface SearchResultV2 {
  id: string
  entity_type: string
  entity_id: string
  title: string
  subtitle: string | null
  metadata: Record<string, unknown>
  route: string
}

const ROUTE_MAP: Record<string, (id: string) => string> = {
  candidate: (id) => `/recruitment/candidates/${id}`,
  job: (id) => `/recruitment/jobs/${id}`,
  application: () => `/recruitment/pipeline`,
  employee: (id) => `/hris/employees/${id}`,
  document: (id) => `/documents/${id}`,
  interview: (id) => `/recruitment/interviews/${id}`,
  offer: (id) => `/recruitment/offers/${id}`,
  onboarding: (id) => `/onboarding/${id}`,
  payroll: (id) => `/payroll/${id}`,
  leave: (id) => `/attendance/leave/${id}`,
  compliance: (id) => `/compliance/${id}`,
}

function mapResult(row: Record<string, unknown>): SearchResultV2 {
  const entityType = row.entity_type as string
  const entityId = row.entity_id as string
  return {
    id: row.id as string,
    entity_type: entityType,
    entity_id: entityId,
    title: stripSensitive((row.title as string) ?? ''),
    subtitle: row.subtitle ? stripSensitive(row.subtitle as string) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    route: ROUTE_MAP[entityType]?.(entityId) ?? '/',
  }
}

export const globalSearchService = {
  search: async (
    companyId: string,
    query: string,
    _userRole: string,
    entityTypes?: string[]
  ): Promise<SearchResultV2[]> => {
    const permitted = await hasPermission('search', 'read')
    if (!permitted) throw new Error('Insufficient permissions: search:read required')

    const sanitizedQuery = query.replace(/[%_]/g, '\\$&')
    if (!query || query.trim().length < 3) return []

    const tsQuery = sanitizedQuery
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `${w}:*`)
      .join(' & ')

    let dbQuery = supabase
      .from('global_search_index')
      .select('id, entity_type, entity_id, title, subtitle, metadata')
      .eq('company_id', companyId)
      .textSearch('searchable_text', tsQuery, { type: 'websearch' })
      .limit(20)

    if (entityTypes && entityTypes.length > 0) {
      dbQuery = dbQuery.in('entity_type', entityTypes)
    }

    const { data, error } = await dbQuery
    if (error) throw error
    return (data ?? []).map(mapResult)
  },

  indexEntity: async (
    companyId: string,
    entityType: string,
    entityId: string,
    title: string,
    subtitle: string,
    searchText: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> => {
    const { error } = await supabase
      .from('global_search_index')
      .upsert(
        {
          company_id: companyId,
          entity_type: entityType,
          entity_id: entityId,
          title,
          subtitle,
          searchable_text: searchText,
          metadata,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'company_id,entity_type,entity_id' }
      )
    if (error) throw error
  },

  removeEntity: async (
    companyId: string,
    entityType: string,
    entityId: string
  ): Promise<void> => {
    const { error } = await supabase
      .from('global_search_index')
      .delete()
      .eq('company_id', companyId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
    if (error) throw error
  },
}
