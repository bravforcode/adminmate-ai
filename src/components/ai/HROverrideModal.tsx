import { useState } from 'react'
import { X, Shield } from 'lucide-react'
import type { AIRecommendation } from '../../types/aiRecruiting'

/* ============================================================
   HR Override Modal — Explicit override with reason
   ============================================================ */

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { overrideScore: number | null; recommendation: AIRecommendation; reason: string }) => void
  originalScore: number | null
  originalRecommendation: string
  loading?: boolean
}

const RECOMMENDATIONS: { value: AIRecommendation; label: string }[] = [
  { value: 'shortlist', label: 'Shortlist' },
  { value: 'review', label: 'Worth Reviewing' },
  { value: 'manual_review', label: 'Manual Review' },
  { value: 'not_enough_evidence', label: 'Not Enough Evidence' },
]

export function HROverrideModal({ isOpen, onClose, onSubmit, originalScore, originalRecommendation, loading }: Props) {
  const [score, setScore] = useState(originalScore?.toString() ?? '')
  const [recommendation, setRecommendation] = useState<AIRecommendation>('manual_review')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim() || reason.trim().length < 3) {
      setError('Override reason is required (minimum 3 characters)')
      return
    }
    const overrideScore = score.trim() ? Math.min(100, Math.max(0, Number(score))) : null
    onSubmit({ overrideScore, recommendation, reason: reason.trim() })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--color-surface)] rounded-2xl shadow-xl border border-[var(--color-border)] w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Override AI Score</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--color-surface-alt)]">
            <X className="w-5 h-5 text-[var(--color-text-muted)]" />
          </button>
        </div>

        {/* Original Score */}
        <div className="mb-4 p-3 bg-[var(--color-surface-alt)] rounded-xl text-sm">
          <p className="text-[var(--color-text-muted)]">Original AI Assessment</p>
          <p className="font-medium text-[var(--color-text-primary)]">
            Score: {originalScore !== null ? `${Math.round(originalScore)}%` : '—'} • {originalRecommendation}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Override Score */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              Override Score (0-100)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={e => setScore(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="Leave empty to keep AI score"
            />
          </div>

          {/* Override Recommendation */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              Override Recommendation
            </label>
            <select
              value={recommendation}
              onChange={e => setRecommendation(e.target.value as AIRecommendation)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {RECOMMENDATIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Reason (required) */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              Reason for Override *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => { setReason(e.target.value); setError('') }}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
              placeholder="Explain why you are overriding the AI assessment..."
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>

          {/* Warning */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-xs text-yellow-700">
              This override will be audit-logged. The original AI score will be preserved alongside your override.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-xl hover:bg-[var(--color-surface-alt)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 text-sm font-medium bg-[var(--color-primary)] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
