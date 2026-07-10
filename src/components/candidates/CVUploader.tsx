import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { storageService } from '../../services/storageService'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { MAX_FILE_SIZE } from '../../utils/constants'
import { useTranslation } from 'react-i18next'

interface CVUploaderProps { candidateId: string; companyId: string }

export function CVUploader({ candidateId, companyId }: CVUploaderProps) {
  const { t } = useTranslation('recruitment')
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState('')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setError('')
    try {
      setUploading(true)
      const { url } = await storageService.uploadCV(candidateId, file)
      const { data: cvDoc, error: docErr } = await supabase.from('cv_documents').insert({
        candidate_id: candidateId, company_id: companyId, file_url: url, file_name: file.name,
        file_size: file.size, file_type: file.type.includes('pdf') ? 'pdf' : 'docx', is_current: true,
      }).select().single()
      if (docErr) throw docErr

      await supabase.from('cv_documents').update({ is_current: false }).eq('candidate_id', candidateId).neq('id', cvDoc.id)

      setUploading(false)
      setParsing(true)
      await supabase.functions.invoke('parse-resume', { body: { cvDocumentId: cvDoc.id, candidateId, companyId } })
      setParsing(false)
      toast.success(t('candidates.upload_success'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('candidates.upload_failed'))
      setUploading(false)
      setParsing(false)
    }
  }, [candidateId, companyId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
    maxFiles: 1, maxSize: MAX_FILE_SIZE,
  })

  return (
    <div>
      <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary-container/10' : 'border-border hover:border-primary/50'}`}>
        <input {...getInputProps()} data-testid="cv-upload-input" />
        {uploading || parsing ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-ink-variant">{uploading ? t('candidates.uploading') : t('candidates.parsing')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload size={32} className="mx-auto text-ink-variant" />
            <p className="text-sm font-medium">{t('candidates.upload_prompt')}</p>
            <p className="text-xs text-ink-variant">{t('candidates.upload_hint')}</p>
          </div>
        )}
      </div>
      {error && <p className="text-error text-sm mt-2">{error}</p>}
    </div>
  )
}
