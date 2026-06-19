import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Brain, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp, Shield, Eye } from 'lucide-react'
import type { CandidateMatchScoreResult, AIScoreBreakdownItem, AIEvidenceItem } from '../../types/aiRecruiting'

/* ============================================================
   Match Score Panel — Evidence-based AI scoring display
   Shows breakdown, evidence, gaps, and HR override area.
   ============================================================ */

interface Props {
  score: CandidateMatchScoreResult | null
  onOverride?: (scoreId: string) => void
  isHR?: boolean
  loading?: boolean
}

const CONFIDENCE_COLORS: Record<string, string> = {
  low: 'text-orange-500 bg-orange-50',
  medium: 'text-yellow-600 bg-yellow-50',
  high: 'text-green-600 bg-green-50',
}

const RECOMMENDATION_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  shortlist: { icon: CheckCircle, color: 'text-green-600', label: 'Recommended for shortlist' },
  review: { icon: Eye, color: 'text-blue-600', label: 'Worth reviewing' },
  manual_review: { icon: AlertTriangle, color: 'text-yellow-600', label: 'Needs manual review' },
  not_enough_evidence: { icon: XCircle, color: 'text-gray-500', label: 'Not enough evidence' },
}

function EvidenceItem({ item }: { item: AIEvidenceItem }) {
  const statusIcon = item.status === 'supported' ? '✓' : item.status === 'missing' ? '✗' : '?'
  const statusColor = item.status === 'supported' ? 'text-green-500' : item.status === 'missing' ? 'text-red-400' : 'text-yellow-500'

  return (
    <div className="flex items-start gap-2 text-xs py-1">
      <span className={statusColor}>{statusIcon}</span>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-[var(--color-text-primary)]">{item.label}: </span>
        <span className="text-[var(--color-text-secondary)]">
          {item.value !== null && item.value !== undefined ? String(item.value) : '—'}
        </span>
        <span className="text-[var(--color-text-muted)] ml-1">({item.source})</span>
        <p className="text-[var(--color-text-muted)] mt-0.5">{item.explanation}</p>
      </div>
    </div>
  )
}

function BreakdownItem({ item }: { item: AIScoreBreakdownItem }) {
  const [expanded, setExpanded] = useState(false)
  const scoreDisplay = item.score !== null ? `${Math.round(item.score)}%` : '—'
  const scoreWidth = item.score !== null ? `${Math.round(item.score)}%` : '0%'

  return (
    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-[var(--color-surface-alt)] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.criterion}</span>
            <span className="text-xs text-[var(--color-text-muted)]">({Math.round(item.weight * 100)}%)</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${CONFIDENCE_COLORS[item.confidence]}`}>
              {item.confidence}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${item.score !== null ? 'bg-[var(--color-primary)]' : 'bg-gray-300'}`}
                style={{ width: scoreWidth }}
              />
            </div>
            <span className="text-sm font-semibold text-[var(--color-text-primary)] w-10 text-right">{scoreDisplay}</span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              {item.evidence.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">Evidence:</p>
                  {item.evidence.map((e, i) => <EvidenceItem key={i} item={e} />)}
                </div>
              )}
              {item.missingEvidence.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-orange-500 mb-1">Missing Evidence:</p>
                  {item.missingEvidence.map((m, i) => <p key={i} className="text-xs text-[var(--color-text-muted)]">• {m}</p>)}
                </div>
              )}
              {item.limitations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Limitations:</p>
                  {item.limitations.map((l, i) => <p key={i} className="text-xs text-[var(--color-text-muted)]">• {l}</p>)}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MatchScorePanel({ score, onOverride, isHR, loading }: Props) {

  if (loading) {
    return (
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 animate-pulse text-[var(--color-primary)]" />
          <span className="font-semibold text-[var(--color-text-primary)]">Calculating match score...</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-[var(--color-surface-alt)] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!score) {
    return (
      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-[var(--color-text-muted)]" />
          <span className="font-semibold text-[var(--color-text-primary)]">Match Score</span>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">No match score calculated yet.</p>
      </div>
    )
  }

  const recConfig = RECOMMENDATION_CONFIG[score.recommendation] || RECOMMENDATION_CONFIG.manual_review
  const RecIcon = recConfig.icon
  const overallDisplay = score.overallScore !== null ? `${Math.round(score.overallScore)}%` : '—'
  const hasHROverride = score.hrOverrideScore !== null && score.hrOverrideScore !== undefined

  return (
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-[var(--color-primary)]" />
          <span className="font-semibold text-[var(--color-text-primary)]">Match Score</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)]">v{score.scoringVersion}</span>
          <span className="text-xs text-[var(--color-text-muted)]">{score.modelName}</span>
        </div>
      </div>

      {/* Overall Score + Recommendation */}
      <div className="flex items-center gap-4 mb-4 p-4 bg-[var(--color-surface-alt)] rounded-xl">
        <div className="text-center">
          <p className="text-3xl font-bold text-[var(--color-text-primary)]">{overallDisplay}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Overall</p>
        </div>
        <div className="flex-1">
          <div className={`flex items-center gap-2 ${recConfig.color}`}>
            <RecIcon className="w-5 h-5" />
            <span className="font-medium text-sm">{recConfig.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${CONFIDENCE_COLORS[score.confidence]}`}>
              Confidence: {score.confidence}
            </span>
          </div>
        </div>
      </div>

      {/* HR Override display */}
      {hasHROverride && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">HR Override</span>
          </div>
          <p className="text-sm text-blue-700">
            Override score: <strong>{Math.round(score.hrOverrideScore!)}%</strong>
          </p>
          {score.hrOverrideReason && (
            <p className="text-xs text-blue-600 mt-1">Reason: {score.hrOverrideReason}</p>
          )}
          <p className="text-xs text-blue-500 mt-1">
            Original AI score: {overallDisplay} • AI recommendation: {recConfig.label}
          </p>
        </div>
      )}

      {/* Sensitive Fields Excluded */}
      {score.sensitiveFieldsExcluded.length > 0 && (
        <div className="mb-4 p-2 bg-gray-50 rounded-lg">
          <p className="text-xs text-[var(--color-text-muted)]">
            <Shield className="w-3 h-3 inline mr-1" />
            Sensitive fields excluded: {score.sensitiveFieldsExcluded.join(', ')}
          </p>
        </div>
      )}

      {/* Human Override Required Badge */}
      <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-700 text-center">
          ⚠️ AI assists, never decides. Human review required for all hiring decisions.
        </p>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-2 mb-4">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Score Breakdown</p>
        {score.breakdown.map((item, i) => <BreakdownItem key={i} item={item} />)}
      </div>

      {/* Red Flags */}
      {score.redFlags.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-red-600 mb-1">Red Flags</p>
          {score.redFlags.map((flag, i) => (
            <p key={i} className="text-xs text-red-500">• {flag}</p>
          ))}
        </div>
      )}

      {/* Gaps */}
      {score.gaps.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-orange-600 mb-1">Gaps</p>
          {score.gaps.map((gap, i) => (
            <p key={i} className="text-xs text-orange-500">• {gap}</p>
          ))}
        </div>
      )}

      {/* HR Override Button */}
      {isHR && !hasHROverride && onOverride && (
        <button
          onClick={() => onOverride(score.candidateId)}
          className="w-full py-2 text-sm font-medium text-[var(--color-primary)] border border-[var(--color-primary)] rounded-xl hover:bg-[var(--color-primary)]/5 transition-colors"
        >
          Override Score
        </button>
      )}

      {/* Metadata */}
      <div className="mt-4 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
        Prompt: {score.promptVersion} • Created: {new Date(score.createdAt).toLocaleString()}
      </div>
    </div>
  )
}
