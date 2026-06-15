/**
 * Parse a CSV string into an array of objects using the first row as headers.
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const parseRow = (line: string): string[] => {
    const cells: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = false
          }
        } else {
          current += ch
        }
      } else {
        if (ch === '"') {
          inQuotes = true
        } else if (ch === ',') {
          cells.push(current.trim())
          current = ''
        } else {
          current += ch
        }
      }
    }
    cells.push(current.trim())
    return cells
  }

  const headers = parseRow(lines[0])
  return lines.slice(1).map(line => {
    const values = parseRow(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = values[i] ?? '' })
    return obj
  })
}

/**
 * Convert an array of objects to a CSV string.
 */
export function toCSV(data: Record<string, unknown>[], headers?: string[]): string {
  if (data.length === 0) return ''
  const cols = headers ?? Object.keys(data[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const rows = [cols.join(',')]
  for (const row of data) {
    rows.push(cols.map(c => escape(row[c])).join(','))
  }
  return rows.join('\n')
}

/**
 * Trigger a browser download of a CSV string.
 */
export function downloadCSV(csvString: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export interface ValidationRule {
  required?: boolean
  pattern?: RegExp
  label?: string
}

/**
 * Validate CSV data against a schema. Returns errors per row/field.
 */
export function validateCSV(
  data: Record<string, string>[],
  schema: Record<string, ValidationRule>
): Array<{ row: number; field: string; message: string }> {
  const errors: Array<{ row: number; field: string; message: string }> = []

  data.forEach((row, idx) => {
    const rowNum = idx + 2 // 1-indexed, +1 for header
    for (const [field, rules] of Object.entries(schema)) {
      const val = row[field] ?? ''
      if (rules.required && !val.trim()) {
        errors.push({ row: rowNum, field, message: `${rules.label ?? field} is required` })
      }
      if (rules.pattern && val && !rules.pattern.test(val)) {
        errors.push({ row: rowNum, field, message: `${rules.label ?? field} is invalid` })
      }
    }
  })

  return errors
}
