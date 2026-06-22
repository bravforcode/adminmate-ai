import { supabase } from '../../lib/supabase'

export type QuarantineStatus = 'active' | 'expired' | 'dismissed'

export interface QuarantinedTest {
  id: string
  company_id: string
  test_name: string
  reason: string
  status: QuarantineStatus
  expires_at: string | null
  quarantined_by: string
  quarantined_at: string
  dismissed_at: string | null
}

export interface QuarantineInput {
  testName: string
  reason: string
  expiresAt?: string
  quarantinedBy: string
}

export const testQuarantineService = {
  async quarantine(
    companyId: string,
    input: QuarantineInput
  ): Promise<QuarantinedTest> {
    const { data: existing } = await supabase
      .from('quarantined_tests')
      .select('id, status')
      .eq('company_id', companyId)
      .eq('test_name', input.testName)
      .eq('status', 'active')
      .maybeSingle()

    if (existing) {
      throw new Error(
        `Test "${input.testName}" is already quarantined (id: ${existing.id})`
      )
    }

    const { data, error } = await supabase
      .from('quarantined_tests')
      .insert({
        company_id: companyId,
        test_name: input.testName,
        reason: input.reason,
        status: 'active',
        expires_at: input.expiresAt ?? null,
        quarantined_by: input.quarantinedBy,
        quarantined_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return data as QuarantinedTest
  },

  async unquarantine(
    companyId: string,
    testName: string
  ): Promise<QuarantinedTest | null> {
    const { data: existing } = await supabase
      .from('quarantined_tests')
      .select('id')
      .eq('company_id', companyId)
      .eq('test_name', testName)
      .eq('status', 'active')
      .maybeSingle()

    if (!existing) return null

    const { data, error } = await supabase
      .from('quarantined_tests')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data as QuarantinedTest
  },

  async getQuarantined(
    companyId: string,
    options?: { includeExpired?: boolean }
  ): Promise<QuarantinedTest[]> {
    const query = supabase
      .from('quarantined_tests')
      .select('*')
      .eq('company_id', companyId)

    if (!options?.includeExpired) {
      query.eq('status', 'active')
    }

    const { data, error } = await query.order('quarantined_at', {
      ascending: false,
    })

    if (error) throw error
    return (data ?? []) as QuarantinedTest[]
  },

  async isQuarantined(
    companyId: string,
    testName: string
  ): Promise<boolean> {
    const { count, error } = await supabase
      .from('quarantined_tests')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('test_name', testName)
      .eq('status', 'active')

    if (error) throw error
    return (count ?? 0) > 0
  },

  async getQuarantineHistory(
    companyId: string,
    testName: string
  ): Promise<QuarantinedTest[]> {
    const { data, error } = await supabase
      .from('quarantined_tests')
      .select('*')
      .eq('company_id', companyId)
      .eq('test_name', testName)
      .order('quarantined_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as QuarantinedTest[]
  },
}
