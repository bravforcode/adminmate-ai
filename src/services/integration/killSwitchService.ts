import { supabase } from '../../lib/supabase'

export const killSwitchService = {
  async activate(providerName: string, reason: string): Promise<void> {
    await supabase.rpc('activate_kill_switch', {
      p_provider_name: providerName,
      p_reason: reason,
    })
  },

  async isKilled(providerName: string): Promise<boolean> {
    const { data } = await supabase
      .from('feature_flags')
      .select('is_active')
      .eq('flag_name', `kill_switch_${providerName}`)
      .single()
    return data?.is_active ?? false
  },

  async deactivate(providerName: string): Promise<void> {
    await supabase
      .from('feature_flags')
      .update({ is_active: false })
      .eq('flag_name', `kill_switch_${providerName}`)
  },

  async getActive(): Promise<string[]> {
    const { data } = await supabase
      .from('feature_flags')
      .select('flag_name')
      .like('flag_name', 'kill_switch_%')
      .eq('is_active', true)
    return (data ?? []).map(r => r.flag_name.replace('kill_switch_', ''))
  },
}
