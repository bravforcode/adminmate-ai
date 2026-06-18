import { useState } from 'react'
import { Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

import { OfferLetterData } from '../../types/models'

interface Props { data: OfferLetterData }

export function PDFDownloadButton({ data }: Props) {
  const { t } = useTranslation('hiring')
  const [generating, setGenerating] = useState(false)

  const download = async () => {
    try {
      setGenerating(true)
      const [{ pdf }, { OfferLetterPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./OfferLetterPDF'),
      ])
      const labels = {
        offerTitle: t('pdf.offer_title', 'OFFER OF EMPLOYMENT'),
        parties: t('pdf.parties', 'PARTIES'),
        offerMadeBy: t('pdf.offer_made_by', 'This offer is made by'),
        offerTo: t('pdf.offer_to', 'to'),
        position: t('pdf.position', 'POSITION'),
        title: t('pdf.title_label', 'Title:'),
        type: t('pdf.type_label', 'Type:'),
        startDate: t('pdf.start_date', 'Start Date:'),
        workHours: t('pdf.work_hours', 'Work Hours:'),
        compensation: t('pdf.compensation', 'COMPENSATION'),
        monthlySalary: t('pdf.monthly_salary', 'Monthly Salary:'),
        benefits: t('pdf.benefits', 'BENEFITS'),
        specialConditions: t('pdf.special_conditions', 'SPECIAL CONDITIONS'),
        companyRepresentative: t('pdf.company_representative', 'Company Representative'),
        employee: t('pdf.employee', 'Employee'),
      }
      const blob = await pdf(OfferLetterPDF({ data, labels })).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Offer_Letter_${data.candidates?.full_name?.replace(/\s+/g, '_') || 'candidate'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(t('pdf.downloaded'))
    } catch (err) {
      if (import.meta.env.DEV) console.error('[PDFDownloadButton] PDF generation failed:', err)
      toast.error(t('pdf.failed'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button onClick={download} disabled={generating}
      className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
      <Download size={16} /> {generating ? t('pdf.generating') : t('pdf.download')}
    </button>
  )
}
