import { AlertTriangle, X } from 'lucide-react'

interface Props { title: string; message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; variant?: 'danger' | 'warning' }

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel, variant = 'warning' }: Props) {
  const confirmStyle = variant === 'danger' ? 'bg-error hover:bg-error/90' : 'bg-primary hover:opacity-90'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-surface rounded-xl p-6 w-full max-w-[95vw] sm:max-w-md shadow-lg">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${variant === 'danger' ? 'bg-error-container text-error' : 'bg-yellow-50 text-yellow-600'}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-on-surface-variant mt-1">{message}</p>
            <div className="flex gap-3 mt-4">
              <button onClick={onCancel} className="flex-1 px-4 py-2 border border-outline-variant rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors">Cancel</button>
              <button onClick={onConfirm} className={`flex-1 px-4 py-2 text-on-primary rounded-lg text-sm font-medium transition-colors ${confirmStyle}`}>{confirmLabel}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
