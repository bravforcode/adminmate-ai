import { supabase } from '../../lib/supabase'
import { logger } from '../../lib/logger'

export interface RLSPolicyBaseline {
  table_name: string
  policy_name: string
  command: string
  roles: string[]
  definition: string | null
  check: string | null
}

export interface RLSDriftChange {
  table_name: string
  policy_name: string
  change_type: 'added' | 'removed' | 'modified'
  baseline?: RLSPolicyBaseline
  current?: Partial<RLSPolicyBaseline>
  field_diffs?: string[]
}

export interface RLSDriftResult {
  detected: boolean
  changes: RLSDriftChange[]
  checked_at: string
}

export const rlsDriftService = {
  detectDrift: async (
    companyId: string,
    baseline: RLSPolicyBaseline[]
  ): Promise<RLSDriftResult> => {
    const { data: currentPolicies, error } = await supabase
      .rpc('get_rls_policies', { p_company_id: companyId })

    if (error) {
      logger.error('Failed to fetch current RLS policies', { error: error.message })
      return { detected: false, changes: [], checked_at: new Date().toISOString() }
    }

    const current = (currentPolicies ?? []) as RLSPolicyBaseline[]
    const changes = rlsDriftService.getPolicyDiff(baseline, current)

    return {
      detected: changes.length > 0,
      changes,
      checked_at: new Date().toISOString(),
    }
  },

  getPolicyDiff: (
    baseline: RLSPolicyBaseline[],
    current: RLSPolicyBaseline[]
  ): RLSDriftChange[] => {
    const changes: RLSDriftChange[] = []

    const baselineMap = new Map(
      baseline.map(p => [`${p.table_name}::${p.policy_name}`, p])
    )
    const currentMap = new Map(
      current.map(p => [`${p.table_name}::${p.policy_name}`, p])
    )

    for (const [key, basePolicy] of baselineMap) {
      const currentPolicy = currentMap.get(key)
      if (!currentPolicy) {
        changes.push({
          table_name: basePolicy.table_name,
          policy_name: basePolicy.policy_name,
          change_type: 'removed',
          baseline: basePolicy,
        })
        continue
      }

      const field_diffs: string[] = []
      if (basePolicy.command !== currentPolicy.command) field_diffs.push('command')
      if (JSON.stringify(basePolicy.roles) !== JSON.stringify(currentPolicy.roles))
        field_diffs.push('roles')
      if (basePolicy.definition !== currentPolicy.definition) field_diffs.push('definition')
      if (basePolicy.check !== currentPolicy.check) field_diffs.push('check')

      if (field_diffs.length > 0) {
        changes.push({
          table_name: basePolicy.table_name,
          policy_name: basePolicy.policy_name,
          change_type: 'modified',
          baseline: basePolicy,
          current: currentPolicy,
          field_diffs,
        })
      }
    }

    for (const [key, currentPolicy] of currentMap) {
      if (!baselineMap.has(key)) {
        changes.push({
          table_name: currentPolicy.table_name,
          policy_name: currentPolicy.policy_name,
          change_type: 'added',
          current: currentPolicy,
        })
      }
    }

    return changes
  },

  alertOnDrift: async (
    companyId: string,
    driftResult: RLSDriftResult
  ): Promise<boolean> => {
    if (!driftResult.detected) return false

    const { error } = await supabase
      .from('security_audit_log')
      .insert({
        company_id: companyId,
        event_type: 'rls_drift_detected',
        severity: 'critical',
        resource_type: 'rls_policy',
        details: {
          change_count: driftResult.changes.length,
          changes: driftResult.changes,
          checked_at: driftResult.checked_at,
        },
      })

    if (error) {
      logger.error('Failed to alert on RLS drift', { error: error.message })
      return false
    }

    return true
  },
}
