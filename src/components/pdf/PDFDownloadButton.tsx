import { useState } from 'react'
import { Download } from 'lucide-react'
import toast from 'react-hot-toast'

import { OfferLetterData } from '../../types/models'

interface Props { data: OfferLetterData }

export function PDFDownloadButton({ data }: Props) {
  const [generating, setGenerating] = useState(false)

  const download = async () => {
    try {
      setGenerating(true)
      const [{ pdf }, { OfferLetterPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./OfferLetterPDF'),
      ])
      const blob = await pdf(OfferLetterPDF({ data })).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Offer_Letter_${data.candidates?.full_name?.replace(/\s+/g, '_') || 'candidate'}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF downloaded')
    } catch {
      toast.error('Failed to generate PDF')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button onClick={download} disabled={generating}
      className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
      <Download size={16} /> {generating ? 'Generating...' : 'Download PDF'}
    </button>
  )
}
