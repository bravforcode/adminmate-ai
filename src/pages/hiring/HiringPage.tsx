import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOffers, useUpdateOffer } from '../../hooks/useOffers'
import { useAuthStore } from '../../stores/authStore'
import { OfferForm } from '../../components/offers/OfferForm'
import { PDFDownloadButton } from '../../components/pdf/PDFDownloadButton'
import { Plus, FileText, Receipt, ScrollText, Shield, Send, ExternalLink, CalendarPlus } from 'lucide-react'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'
import { calendarService } from '../../services/calendarService'
import { Button } from '../../components/ui/Button'
import { useUpcomingInterviews } from '../../hooks/useInterviews'

import { Offer } from '../../types/models'
import { LoadingState } from '../../components/shared/LoadingState'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-sunken text-ink-muted text-ink-muted',
  sent: 'bg-secondary-container text-ink-secondary-container dark:text-primary-muted',
  viewed: 'bg-purple-50 dark:bg-warning-subtle/30 text-purple-700 dark:text-warning',
  accepted: 'bg-green-50 dark:bg-success-subtle/30 text-green-700 dark:text-success',
  rejected: 'bg-red-50 dark:bg-destructive-subtle/30 text-red-700 dark:text-destructive',
  expired: 'bg-gray-50 text-gray-500 dark:text-outline-variant',
}

const DOC_TYPE_KEYS = [
  { key: 'pnd1', icon: Receipt },
  { key: 'labor_contract', icon: ScrollText },
  { key: 'bpjs', icon: Shield },
]

export function HiringPage() {
  const { t } = useTranslation(['hiring', 'calendar'])
  const { data: offers, isLoading } = useOffers()
  const updateOffer = useUpdateOffer()
  const company = useAuthStore(s => s.company)
  const { data: upcomingInterviews } = useUpcomingInterviews()
  const [showForm, setShowForm] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const [reminders, setReminders] = useState<Record<string, boolean>>({})

  const toggleReminder = (id: string) => {
    setReminders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-ink text-ink">{t('title')}</h1>
          <p className="text-body-md text-ink-muted text-ink-muted mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!upcomingInterviews?.length) { toast(t('calendar.no_interviews', { ns: 'calendar' })); return }
              const ics = calendarService.generateBulkCalendar(upcomingInterviews)
              calendarService.downloadCalendarFile(ics, 'all-upcoming-interviews.ics')
            }}
            icon={<CalendarPlus size={16} />}
          >
            {t('calendar.export_interviews', { ns: 'calendar' })}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
            if (!offers?.length) { toast(t('toasts.no_offers_export')); return }
            const headers = ['Candidate', 'Position', 'Salary', 'Currency', 'Status', 'Start Date']
            const rows = offers.map((o: Offer) => [
              o.candidates?.full_name || '',
              o.position_title || '',
              o.salary_offered || '',
              o.salary_currency || '',
              o.status || '',
              o.start_date || '',
            ])
            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = `offer-audit-${new Date().toISOString().split('T')[0]}.csv`
            a.click(); URL.revokeObjectURL(url)
          }}>
            {t('export_audit')}
          </Button>
          <Button
            variant="default"
            size="md"
            onClick={() => setShowForm(true)}
            icon={<Plus size={18} />}
          >
            {t('create_offer')}
          </Button>
        </div>
      </div>

      {showForm && (
        <div className="bg-surface rounded-xl border border-border p-6">
          <OfferForm onClose={() => setShowForm(false)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6 w-full min-w-0">
          {/* Document Generation Module */}
          <section className="bg-surface border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-ink mb-4">{t('doc_generation.title')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DOC_TYPE_KEYS.map(doc => (
                <button
                  key={doc.key}
                  onClick={() => setShowForm(true)}
                  className="flex flex-col items-start p-4 border border-border rounded-lg hover:border-primary dark:hover:border-primary hover:bg-surface-sunken dark:hover:bg-surface-sunken transition-all text-left group"
                >
                  <doc.icon size={24} className="text-ink-faint mb-3 group-hover:text-primary dark:group-hover:text-primary-muted transition-colors" />
                  <span className="text-base font-semibold text-ink text-ink">{t(`doc_generation.${doc.key}`)}</span>
                  <span className="text-xs text-ink-muted text-ink-muted mt-1">{t(`doc_generation.${doc.key}_sub`)}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Document Tracking Table */}
          <section className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-sunken-lowest bg-surface-sunken-lowest">
              <h3 className="text-lg font-semibold text-ink text-ink">{t('tracking.title')}</h3>
              <span className="text-xs font-semibold text-ink-muted text-ink-muted bg-surface-sunken px-2 py-1 rounded">
                {offers?.filter((o: Offer) => o.status !== 'accepted').length || 0} {t('tracking.pending')}
              </span>
            </div>
            {isLoading ? (
              <LoadingState variant="table" rows={4} message={t('loading', { ns: 'common' })} />
            ) : (
              <div className="table-scroll">
                <table role="table" className="table-card-mobile w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-surface-sunken bg-surface-sunken/50 border-b border-border/50 border-border/50">
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted text-ink-muted">
                        {t('tracking.candidate')}
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted text-ink-muted">
                        {t('tracking.doc_type')}
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted text-ink-muted">
                        {t('tracking.status')}
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-ink-muted text-ink-muted text-center">
                        {t('tracking.auto_remind')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-ink text-ink">
                    {offers?.map((offer: Offer) => (
                      <tr
                        key={offer.id}
                        onClick={() => setSelectedOffer(offer)}
                        className={cn(
                          'border-b border-border/50 border-border/50 hover:bg-surface-sunken/50 dark:hover:bg-surface-sunken/30 transition-colors duration-150 cursor-pointer',
                          selectedOffer?.id === offer.id && 'bg-surface-sunken bg-surface-sunken'
                        )}
                      >
                        <td className="py-3 px-4 text-sm text-ink text-ink" data-label={t('tracking.candidate')}>
                          <div className="text-sm font-semibold text-ink text-ink">{offer.candidates?.full_name}</div>
                          <div className="text-xs text-ink-muted text-ink-muted">{offer.position_title}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-ink text-ink" data-label={t('tracking.doc_type')}>{t('tracking.offer_letter')}</td>
                        <td className="py-3 px-4 text-sm text-ink text-ink" data-label={t('tracking.status')}>
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
                              STATUS_COLORS[offer.status ?? ''] || ''
                            )}
                          >
                            {offer.status ? t(offer.status) : ''} {offer.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-ink text-center" data-label={t('tracking.auto_remind')}>
                          {offer.status === 'accepted' ? (
                            <div className="relative inline-flex items-center cursor-not-allowed opacity-50">
                              <div className="w-9 h-5 bg-outline-variant rounded-full">
                                <div className="absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-4 w-4" />
                              </div>
                            </div>
                          ) : (
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={!!reminders[offer.id]}
                                onChange={e => {
                                  e.stopPropagation()
                                  toggleReminder(offer.id)
                                }}
                              />
                              <div className="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
                            </label>
                          )}
                        </td>
                      </tr>
                    ))}
                    {offers?.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-ink-muted">
                          {t('no_offers')}. {t('create_first_offer')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4">
          <aside className="bg-surface border border-border rounded-xl shadow-[0px_4px_20px_rgba(0,33,82,0.08)] flex flex-col h-auto min-h-[400px] lg:h-[600px] lg:sticky lg:top-6">
            {/* Preview Header */}
            <div className="p-4 border-b border-border bg-surface-sunken rounded-t-xl flex justify-between items-center">
              <div>
                <h4 className="text-base font-semibold text-ink text-ink">
                  {selectedOffer ? t('preview.offer_preview') : t('preview.empty_title')}
                </h4>
                <p className="text-xs text-ink-muted text-ink-muted">
                  {selectedOffer
                    ? `${selectedOffer.candidates?.full_name} · ${selectedOffer.jobs?.title || ''}`
                    : t('preview.empty_subtitle')}
                </p>
              </div>
              <button className="text-ink-muted text-ink-muted hover:text-primary dark:hover:text-primary-muted transition-colors">
                <ExternalLink size={18} />
              </button>
            </div>

            {/* Document Canvas */}
            <div className="flex-1 p-6 overflow-y-auto bg-surface-sunken-lowest bg-surface-sunken-lowest relative">
              <div className="absolute inset-0 flex justify-center items-center pointer-events-none opacity-5">
                <FileText size={120} />
              </div>
              {selectedOffer ? (
                <div className="max-w-[90%] mx-auto bg-white border border-border p-5 shadow-sm rounded space-y-4 text-sm text-ink relative z-10">
                  <div className="text-center text-base font-semibold mb-3 border-b border-border pb-2 uppercase">
                    {t('preview.offer_letter')}
                  </div>
                  <div>
                    <span className="font-bold">{t('preview.employer')}:</span> {company?.name || 'AdminMate AI Co.'}
                  </div>
                  <div>
                    <span className="font-bold">{t('preview.employee')}:</span>{' '}
                    <span className="bg-primary-container text-white-container px-1 rounded animate-pulse">
                      {selectedOffer.candidates?.full_name}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold">{t('preview.position')}:</span>{' '}
                    <span className="bg-primary-container text-white-container px-1 rounded">
                      {selectedOffer.position_title}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold">{t('preview.salary')}:</span>{' '}
                    <span className="bg-primary-container text-white-container px-1 rounded">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedOffer.salary_currency ?? 'THB' }).format(
                        selectedOffer.salary_offered ?? 0
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold">{t('preview.start_date')}:</span>{' '}
                    <span className="bg-primary-container text-white-container px-1 rounded">
                      {selectedOffer.start_date}
                    </span>
                  </div>
                  <p className="text-ink-muted text-ink-muted mt-2 leading-relaxed text-xs">
                    {t('preview.disclaimer')}
                  </p>
                  <div className="mt-6 border-t border-dashed border-border pt-4 flex justify-between">
                    <div>
                      <span className="font-bold block mb-2 text-xs">{t('preview.employer_sig')}</span>
                      <div className="h-8 w-24 bg-surface-sunken rounded" />
                    </div>
                    <div>
                      <span className="font-bold block mb-2 text-xs">{t('preview.employee_sig')}</span>
                      <div className="h-8 w-24 bg-surface-sunken rounded border border-dashed border-primary" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-ink-muted text-ink-muted relative z-10">
                  <FileText size={48} className="mb-3 opacity-30" />
                  <p className="text-sm">{t('preview.select_offer')}</p>
                </div>
              )}
            </div>

            {/* Preview Actions */}
            <div className="p-4 border-t border-border bg-surface flex gap-3 rounded-b-xl">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!selectedOffer) { toast(t('toasts.select_offer_first')); return }
                  if (selectedOffer.status !== 'draft') { toast(t('toasts.only_draft_editable')); return }
                  setShowForm(true)
                }}
                fullWidth
              >
                {t('preview.edit_draft')}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  if (!selectedOffer) { toast(t('toasts.select_offer_first')); return }
                  updateOffer.mutate({ id: selectedOffer.id, data: { status: 'sent' } })
                }}
                icon={<Send size={14} />}
                fullWidth
              >
                {t('preview.send_for_sig')}
              </Button>
            </div>
            {selectedOffer && (
              <div className="px-4 pb-4 bg-surface">
                <PDFDownloadButton data={selectedOffer} />
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

export default HiringPage
