import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCandidates } from '../../hooks/useCandidates'
import { CandidateCard } from '../../components/candidates/CandidateCard'
import { CandidateForm } from '../../components/candidates/CandidateForm'

export function CandidatesPage() {
  const { t } = useTranslation('recruitment')
  const { data: candidates, isLoading } = useCandidates()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = candidates?.filter(c => !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()) || c.current_position?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">{t('candidates.title')}</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Manage your candidate database</p>
        </div>
        <button onClick={() => setShowForm(true)} data-testid="add-candidate"
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 transition-opacity">
          <Plus size={18} /> Add Candidate
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary outline-none text-sm" placeholder="Search candidates..." />
      </div>

      {showForm && (
        <div className="bg-surface rounded-xl border border-outline-variant p-6">
          <CandidateForm onClose={() => setShowForm(false)} />
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-on-surface-variant">Loading...</div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-on-surface-variant">{t('candidates.no_candidates')}</p>
          <button onClick={() => setShowForm(true)} className="mt-2 text-primary font-medium hover:underline">Add your first candidate</button>
        </div>
      ) : (
        <div className="grid gap-4">{filtered?.map(c => <CandidateCard key={c.id} candidate={c} />)}</div>
      )}
    </div>
  )
}

export default CandidatesPage
