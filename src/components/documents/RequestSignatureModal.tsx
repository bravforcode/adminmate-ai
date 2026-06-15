import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
            className="bg-surface dark:bg-[#1e293b] rounded-xl p-6 w-full max-w-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-on-surface dark:text-[#f1f5f9]">{t('request_signature_modal_title')}</h2>
              <button onClick={onClose} className="p-1 hover:bg-surface-container dark:hover:bg-[#1e3a5f] rounded dark:text-[#f1f5f9]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface dark:text-[#f1f5f9] mb-1">{t('signer_name')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-sm dark:text-[#f1f5f9] focus:border-primary dark:focus:border-[#3b82f6] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface dark:text-[#f1f5f9] mb-1">{t('signer_email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant dark:border-[#334155] bg-surface-container-lowest dark:bg-[#0f172a] text-sm dark:text-[#f1f5f9] focus:border-primary dark:focus:border-[#3b82f6] outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-outline-variant dark:border-[#334155] rounded-lg text-sm font-medium hover:bg-surface-container-low dark:hover:bg-[#1e3a5f] transition-colors dark:text-[#f1f5f9]"
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
