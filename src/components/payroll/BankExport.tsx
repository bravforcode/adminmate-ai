import { useState } from 'react'
import { Download, Building2, FileText } from 'lucide-react'
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import type { PayrollRunItem } from '../../services/payroll/payrollRunService'

interface BankExportProps {
  items: PayrollRunItem[]
  companyName?: string
  periodLabel?: string
}

type BankFormat = 'scb' | 'kbank' | 'bbl' | 'ktb' | 'csv'

const BANK_OPTIONS: { value: BankFormat; label: string }[] = [
  { value: 'scb', label: 'SCB (Siam Commercial Bank)' },
  { value: 'kbank', label: 'KBANK (Kasikornbank)' },
  { value: 'bbl', label: 'BBL (Bangkok Bank)' },
  { value: 'ktb', label: 'KTB (Krungthai Bank)' },
  { value: 'csv', label: 'Generic CSV' },
]

/**
 * Generate bank-format file content for salary transfer.
 * ponytail: Real bank formats require account numbers, branch codes,
 * and specific fixed-width formats. This generates a CSV approximation
 * that can be adapted per bank's actual spec.
 */
function generateBankFile(
  items: PayrollRunItem[],
  format: BankFormat,
  companyName: string,
): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')

  if (format === 'csv') {
    const header = 'employee_id,net_pay,currency,reference_date,company'
    const rows = items.map(i =>
      `${i.employee_id},${i.net_pay.toFixed(2)},THB,${dateStr},${companyName}`,
    )
    return [header, ...rows].join('\n')
  }

  // Thai bank fixed-width format approximation
  // Header record
  const lines: string[] = []
  lines.push(`H,${companyName.padEnd(50)},${dateStr},${items.length.toString().padStart(6, '0')}`)

  // Detail records
  for (const item of items) {
    const amt = (item.net_pay * 100).toFixed(0).padStart(12, '0') // satang, no decimal
    lines.push(`D,${item.employee_id.padEnd(20)},${amt},THB,${format.toUpperCase()}`)
  }

  // Trailer record
  const totalSatang = items.reduce((s, i) => s + Math.round(i.net_pay * 100), 0)
  lines.push(`T,${items.length.toString().padStart(6, '0')},${totalSatang.toString().padStart(15, '0')}`)

  return lines.join('\n')
}

export function BankExport({ items, companyName = 'Company', periodLabel = '' }: BankExportProps) {
  const [format, setFormat] = useState<BankFormat>('csv')
  const [exported, setExported] = useState(false)

  const totalNet = items.reduce((s, i) => s + i.net_pay, 0)
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handleExport = () => {
    const content = generateBankFile(items, format, companyName)
    const ext = format === 'csv' ? 'csv' : 'txt'
    const filename = `payroll_${format}_${periodLabel || 'export'}.${ext}`
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setExported(true)
    setTimeout(() => setExported(false), 3000)
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Building2 size={20} className="text-primary" />
        <CardTitle>Bank Export</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 bg-surface-sunken rounded-lg">
            <p className="text-xs text-ink-variant">Employees</p>
            <p className="text-lg font-semibold">{items.length}</p>
          </div>
          <div className="p-3 bg-surface-sunken rounded-lg">
            <p className="text-xs text-ink-variant">Total Net Pay</p>
            <p className="text-lg font-semibold">{fmt(totalNet)} THB</p>
          </div>
          <div className="p-3 bg-surface-sunken rounded-lg">
            <p className="text-xs text-ink-variant">Format</p>
            <select
              value={format}
              onChange={e => setFormat(e.target.value as BankFormat)}
              className="w-full mt-1 px-2 py-1 rounded border border-border bg-surface-sunken-lowest text-sm"
            >
              {BANK_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="default"
            size="md"
            icon={<Download size={16} />}
            onClick={handleExport}
            disabled={items.length === 0}
          >
            {exported ? 'Exported!' : 'Download Bank File'}
          </Button>
          {exported && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <FileText size={14} /> File downloaded
            </span>
          )}
        </div>

        <p className="text-xs text-ink-variant">
          Exports salary transfer file for {BANK_OPTIONS.find(b => b.value === format)?.label}.
          Verify format with your bank before submitting.
        </p>
      </CardContent>
    </Card>
  )
}
