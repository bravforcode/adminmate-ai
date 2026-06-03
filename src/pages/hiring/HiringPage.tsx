import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOffers, useUpdateOffer } from '../../hooks/useOffers'
import { useAuthStore } from '../../stores/authStore'
import { OfferForm } from '../../components/offers/OfferForm'
import { PDFDownloadButton } from '../../components/pdf/PDFDownloadButton'
import { Plus, FileText, Receipt, ScrollText, Shield, Send, ExternalLink, ListFilter } from 'lucide-react'
import { cn } from '../../utils/cn'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-surface-container text-on-surface-variant',
  sent: 'bg-secondary-container text-on-secondary-container',
  viewed: 'bg-purple-50 text-purple-700',
  accepted: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  expired: 'bg-gray-50 text-gray-500',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  accepted: 'Signed',
  rejected: 'Rejected',
  expired: 'Expired',
}

const DOC_TYPES = [
  { label: 'P.N.D. 1', sub: 'Thailand Tax Auth', icon: Receipt },
  { label: 'Labor Contract', sub: 'Vietnam Standard', icon: ScrollText },
  { label: 'BPJS Enrollment', sub: 'Indonesia Health', icon: Shield },
]

export function HiringPage() {
  const { t } = useTranslation('hiring')
  const { data: offers, isLoading } = useOffers()
  const updateOffer = useUpdateOffer()
  const company = useAuthStore(s => s.company)
  const [showForm, setShowForm] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<any>(null)
  const [reminders, setReminders] = useState<Record<string, boolean>>({})

  const toggleReminder = (id: string) => {
    setReminders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-surface">{t('title')}</h1>
          <p className="text-body-md text-on-surface-variant mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button className="border border-outline-variant text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors">
            {t('export_audit')}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90"
          >
            <Plus size={18} /> {t('create_offer')}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-surface rounded-xl border border-outline-variant p-6">
          <OfferForm onClose={() => setShowForm(false)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Document Generation Module */}
          <section className="bg-surface border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-on-surface mb-4">{t('doc_generation.title')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DOC_TYPES.map(doc => (
                <button
                  key={doc.label}
                  onClick={() => setShowForm(true)}
                  className="flex flex-col items-start p-4 border border-outline-variant rounded-lg hover:border-primary hover:bg-surface-container-low transition-all text-left group"
                >
                  <doc.icon size={24} className="text-tertiary mb-3 group-hover:text-primary transition-colors" />
                  <span className="text-base font-semibold text-on-surface">{doc.label}</span>
                  <span className="text-xs text-on-surface-variant mt-1">{doc.sub}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Document Tracking Table */}
          <section className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <h3 className="text-lg font-semibold text-on-surface">{t('tracking.title')}</h3>
              <span className="text-xs font-semibold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded">
                {offers?.filter((o: any) => o.status !== 'accepted').length || 0} {t('tracking.pending')}
              </span>
            </div>
            {isLoading ? (
              <div className="text-center py-12 text-on-surface-variant">{t('loading', { ns: 'common' })}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container-lowest">
                      <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                        {t('tracking.candidate')}
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                        {t('tracking.doc_type')}
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                        {t('tracking.status')}
                      </th>
                      <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-center">
                        {t('tracking.auto_remind')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-on-surface">
                    {offers?.map((offer: any) => (
                      <tr
                        key={offer.id}
                        onClick={() => setSelectedOffer(offer)}
                        className={cn(
                          'border-b border-outline-variant even:bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer',
                          selectedOffer?.id === offer.id && 'bg-surface-container'
                        )}
                      >
                        <td className="py-4 px-4">
                          <div className="text-base font-semibold text-on-surface">{offer.candidates?.full_name}</div>
                          <div className="text-xs text-on-surface-variant">{offer.position_title}</div>
                        </td>
                        <td className="py-4 px-4 text-sm">{t('tracking.offer_letter')}</td>
                        <td className="py-4 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
                              STATUS_COLORS[offer.status] || ''
                            )}
                          >
                            {STATUS_LABELS[offer.status] || offer.status}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
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
                        <td colSpan={4} className="text-center py-12 text-on-surface-variant">
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
          <aside className="bg-surface border border-outline-variant rounded-xl shadow-[0px_4px_20px_rgba(0,33,82,0.08)] flex flex-col h-[600px] sticky top-6">
            {/* Preview Header */}
            <div className="p-4 border-b border-outline-variant bg-surface-container-low rounded-t-xl flex justify-between items-center">
              <div>
                <h4 className="text-base font-semibold text-on-surface">
                  {selectedOffer ? t('preview.offer_preview') : t('preview.empty_title')}
                </h4>
                <p className="text-xs text-on-surface-variant">
                  {selectedOffer
                    ? `${selectedOffer.candidates?.full_name} · ${selectedOffer.jobs?.title || ''}`
                    : t('preview.empty_subtitle')}
                </p>
              </div>
              <button className="text-on-surface-variant hover:text-primary transition-colors">
                <ExternalLink size={18} />
              </button>
            </div>

            {/* Document Canvas */}
            <div className="flex-1 p-6 overflow-y-auto bg-surface-container-lowest relative">
              <div className="absolute inset-0 flex justify-center items-center pointer-events-none opacity-5">
                <FileText size={120} />
              </div>
              {selectedOffer ? (
                <div className="max-w-[90%] mx-auto bg-white border border-outline-variant p-5 shadow-sm rounded space-y-4 text-sm text-on-surface relative z-10">
                  <div className="text-center text-base font-semibold mb-3 border-b border-outline-variant pb-2 uppercase">
                    {t('preview.offer_letter')}
                  </div>
                  <div>
                    <span className="font-bold">{t('preview.employer')}:</span> {company?.name || 'AdminMate AI Co.'}
                  </div>
                  <div>
                    <span className="font-bold">{t('preview.employee')}:</span>{' '}
                    <span className="bg-primary-container text-on-primary-container px-1 rounded animate-pulse">
                      {selectedOffer.candidates?.full_name}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold">{t('preview.position')}:</span>{' '}
                    <span className="bg-primary-container text-on-primary-container px-1 rounded">
                      {selectedOffer.position_title}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold">{t('preview.salary')}:</span>{' '}
                    <span className="bg-primary-container text-on-primary-container px-1 rounded">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedOffer.salary_currency }).format(
                        selectedOffer.salary_offered
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold">{t('preview.start_date')}:</span>{' '}
                    <span className="bg-primary-container text-on-primary-container px-1 rounded">
                      {selectedOffer.start_date}
                    </span>
                  </div>
                  <p className="text-on-surface-variant mt-2 leading-relaxed text-xs">
                    {t('preview.disclaimer')}
                  </p>
                  <div className="mt-6 border-t border-dashed border-outline-variant pt-4 flex justify-between">
                    <div>
                      <span className="font-bold block mb-2 text-xs">{t('preview.employer_sig')}</span>
                      <div className="h-8 w-24 bg-surface-container rounded" />
                    </div>
                    <div>
                      <span className="font-bold block mb-2 text-xs">{t('preview.employee_sig')}</span>
                      <div className="h-8 w-24 bg-surface-container rounded border border-dashed border-primary" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-on-surface-variant relative z-10">
                  <FileText size={48} className="mb-3 opacity-30" />
                  <p className="text-sm">{t('preview.select_offer')}</p>
                </div>
              )}
            </div>

            {/* Preview Actions */}
            <div className="p-4 border-t border-outline-variant bg-surface flex gap-3 rounded-b-xl">
              <button
                onClick={() => {
                  if (!selectedOffer) { toast('Please select an offer first'); return }
                  toast('Editing coming soon')
                }}
                className="flex-1 border border-primary text-primary py-2 rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors"
              >
                {t('preview.edit_draft')}
              </button>
              <button
                onClick={() => {
                  if (!selectedOffer) { toast('Please select an offer first'); return }
                  updateOffer.mutate({ id: selectedOffer.id, data: { status: 'sent' } })
                }}
                className="flex-1 bg-primary text-on-primary py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-colors flex justify-center items-center gap-2"
              >
                <Send size={14} /> {t('preview.send_for_sig')}
              </button>
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
