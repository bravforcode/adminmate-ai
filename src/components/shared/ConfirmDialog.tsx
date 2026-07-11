import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props { title: string; message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; variant?: 'danger' | 'warning'; open?: boolean }

export function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, variant = 'warning', open = true }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="sm:max-w-md">
        <div className="flex items-start gap-4">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
            variant === 'danger'
              ? 'bg-error-subtle dark:bg-destructive-subtle/30 text-error dark:text-destructive'
              : 'bg-warning-subtle dark:bg-warning-subtle/30 text-warning dark:text-warning'
          )}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="mt-1">{message}</DialogDescription>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onCancel}>{t('common.cancel', 'Cancel')}</Button>
              <Button variant={variant === 'danger' ? 'destructive' : 'default'} onClick={onConfirm}>{confirmLabel || t('common.confirm', 'Confirm')}</Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
