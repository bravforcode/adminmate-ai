import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog'
import { Button } from '../ui/Button'
import { AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props { title: string; message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; variant?: 'danger' | 'warning'; open?: boolean }

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', onConfirm, onCancel, variant = 'warning', open = true }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="sm:max-w-md">
        <div className="flex items-start gap-4">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
            variant === 'danger'
              ? 'bg-red-100 dark:bg-[#450a0a]/30 text-red-600 dark:text-[#f87171]'
              : 'bg-yellow-50 dark:bg-[#451a03]/30 text-yellow-600 dark:text-[#fbbf24]'
          )}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="mt-1">{message}</DialogDescription>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button variant={variant === 'danger' ? 'destructive' : 'default'} onClick={onConfirm}>{confirmLabel}</Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
