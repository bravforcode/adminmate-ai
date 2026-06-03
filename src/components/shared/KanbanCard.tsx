import { Sparkles, MessageSquare } from 'lucide-react'

interface KanbanCardProps {
  name: string
  initials?: string
  photoUrl?: string
  matchScore?: number
  position?: string
  meta?: string
  tags?: string[]
  isActive?: boolean
  onClick?: () => void
  onChat?: () => void
}

export function KanbanCard({
  name,
  initials,
  photoUrl,
  matchScore,
  position,
  meta,
  tags,
  isActive,
  onClick,
  onChat,
}: KanbanCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-xl border border-outline-variant p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden ${
        isActive ? 'border-primary shadow-md' : ''
      }`}
    >
      {isActive && <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />}
      <div className="flex items-start gap-3">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className={`w-12 h-12 rounded-full object-cover shadow-sm ${isActive ? 'ring-2 ring-primary-fixed' : ''}`}
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-lg shadow-sm">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className={`text-base font-semibold text-on-surface leading-tight ${isActive ? 'font-bold' : ''}`}>
            {name}
          </div>
          {meta && <div className="text-xs text-on-surface-variant mt-0.5">{meta}</div>}
          {position && <div className="text-xs text-on-surface-variant mt-0.5">{position}</div>}
        </div>
        {typeof matchScore === 'number' && (
          <div
            className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${
              matchScore >= 80
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container text-on-surface-variant border border-outline-variant/50'
            }`}
          >
            {matchScore >= 80 && <Sparkles size={12} />}
            {matchScore}%
          </div>
        )}
        {onChat && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onChat()
            }}
            className="text-on-surface-variant hover:text-primary hover:bg-primary-fixed/50 p-1.5 rounded-full transition-colors"
          >
            <MessageSquare size={16} />
          </button>
        )}
      </div>
      {tags && tags.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {tags.map((tag) => (
            <span key={tag} className="text-xs text-on-surface-variant bg-surface-container px-2 py-1 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
