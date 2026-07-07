import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { leaveService, type LeaveType } from '../../services/attendance/leaveService'
import { Plus, Calendar } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card'

interface LeaveRequestFormProps {
  leaveTypes: LeaveType[]
  onSuccess?: () => void
  onCancel?: () => void
}

export function LeaveRequestForm({ leaveTypes, onSuccess, onCancel }: LeaveRequestFormProps) {
  const { t } = useTranslation(['leave', 'common'])
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    total_days: 1,
    reason: '',
  })

  const createMutation = useMutation({
    mutationFn: () => {
      if (!company?.id || !profile?.id) throw new Error('Missing auth')
      return leaveService.createLeaveRequest(company.id, {
        employee_id: profile.id,
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: form.total_days,
        reason: form.reason || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] })
      setForm({ leave_type_id: '', start_date: '', end_date: '', total_days: 1, reason: '' })
      onSuccess?.()
    },
  })

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    const updated = { ...form, [field]: value }
    if (updated.start_date && updated.end_date && updated.end_date >= updated.start_date) {
      const start = new Date(updated.start_date)
      const end = new Date(updated.end_date)
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      updated.total_days = diffDays
    }
    setForm(updated)
  }

  const isValid = form.leave_type_id && form.start_date && form.end_date && form.total_days > 0

  return (
    <Card className="border-primary dark:border-primary">
      <CardHeader className="border-b border-surface-container-high dark:border-outline bg-surface-bright dark:bg-surface-container-low">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar size={18} className="text-primary dark:text-accent-dim" />
          {t('form.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-on-surface dark:text-on-surface mb-1">{t('form.leave_type')}</label>
            <select
              value={form.leave_type_id}
              onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            >
              <option value="">{t('form.select_type')}</option>
              {leaveTypes.map(lt => (
                <option key={lt.id} value={lt.id}>{lt.name}{lt.name_th ? ` (${lt.name_th})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface dark:text-on-surface mb-1">{t('form.total_days')}</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={form.total_days}
              onChange={(e) => setForm({ ...form, total_days: parseFloat(e.target.value) || 1 })}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface dark:text-on-surface mb-1">{t('form.start_date')}</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => handleDateChange('start_date', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface dark:text-on-surface mb-1">{t('form.end_date')}</label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => handleDateChange('end_date', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-on-surface dark:text-on-surface mb-1">{t('form.reason')}</label>
          <textarea
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
            placeholder={t('form.reason_placeholder')}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>{t('common:cancel')}</Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => createMutation.mutate()}
            disabled={!isValid || createMutation.isPending}
            icon={<Plus size={16} />}
          >
            {createMutation.isPending ? t('form.submitting') : t('form.submit')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
