import { useState } from 'react'
import { Shield, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

interface Props { candidateId?: string; employeeId?: string }

export function PDPAConsentBanner({ candidateId, employeeId }: Props) {
  const company = useAuthStore(s => s.company)
  const [accepted, setAccepted] = useState(false)
  const [purposes] = useState<string[]>(['recruitment_processing'])

  const handleAccept = async () => {
    if (!company?.id) return
    await supabase.from('pdpa_consents').insert({
      company_id: company.id, candidate_id: candidateId, employee_id: employeeId,
      data_subject_email: '', consent_type: 'recruitment', purposes, consent_given: true,
      consent_form_version: '1.0',
    })
    setAccepted(true)
  }

  if (accepted || (!candidateId && !employeeId)) return null

  return (
    <div className="bg-surface rounded-xl border border-primary/20 p-4 mb-4">
      <div className="flex items-start gap-3">
        <Shield size={20} className="text-primary flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold">Data Privacy Consent</h4>
          <p className="text-xs text-on-surface-variant mt-1">We collect and process your personal data for recruitment purposes under applicable data protection laws (PDPA Thailand / Decree 13 Vietnam / UU PDP Indonesia). Your data will be retained for 2 years or until consent is withdrawn.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={handleAccept} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-medium hover:opacity-90">
              <Check size={12} /> I Consent
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
