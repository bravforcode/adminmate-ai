import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { signatureService } from '../../services/signatureService'
import toast from 'react-hot-toast'

interface RequestSignatureModalProps {
  documentId: string
  onClose: () => void
  open?: boolean
}

export function RequestSignatureModal({ documentId, onClose, open = true }: RequestSignatureModalProps) {
  const { t } = useTranslation(['documents', 'common'])
  const company = useAuthStore(s => s.company)
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const mutation = useMutation({
    mutationFn: () => signatureService.requestSignature(company!.id, documentId, { name, email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['signatures', documentId] })
      toast.success(t('signature_requested'))
      onClose()
    },
    onError: () => toast.error(t('signature_request_failed')),
  })

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    mutation.mutate()
  }, [name, email, mutation])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="bg-surface rounded-xl p-6 w-full max-w-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink dark:text-ink">{t('request_signature_modal_title')}</h2>
              <button onClick={onClose} className="p-2 hover:bg-surface-sunken dark:hover:bg-surface-sunken rounded min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">{t('signer_name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest dark:bg-surface-sunken-lowest text-sm focus:border-primary dark:focus:border-error outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1">{t('signer_email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest dark:bg-surface-sunken-lowest text-sm focus:border-primary dark:focus:border-error outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-sunken dark:hover:bg-surface-sunken transition-colors dark:text-ink"
                >
                  {t('common:cancel')}
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending || !name.trim() || !email.trim()}
                  className="flex-1 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {t('send_request')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
