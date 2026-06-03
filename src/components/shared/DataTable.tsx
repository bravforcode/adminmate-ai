import { useState } from 'react'
import { ChevronUp, ChevronDown, Search } from 'lucide-react'

interface Column { key: string; label: string; sortable?: boolean; render?: (value: any, row: any) => React.ReactNode }
interface Props { columns: Column[]; data: any[]; searchable?: boolean; onRowClick?: (row: any) => void }

export function DataTable({ columns, data, searchable, onRowClick }: Props) {
  const [sortKey, setSortKey] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [search, setSearch] = useState('')

  const filtered = search ? data.filter(row => columns.some(col => String(row[col.key] || '').toLowerCase().includes(search.toLowerCase()))) : data
  const sorted = sortKey ? [...filtered].sort((a, b) => {
    const va = String(a[sortKey] || ''), vb = String(b[sortKey] || '')
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  }) : filtered

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant shadow-sm">
      {searchable && (
        <div className="p-3 border-b border-outline-variant bg-surface-container-low">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary outline-none text-sm" placeholder="Search..." />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead><tr className="border-b border-outline-variant bg-surface-container-low">
            {columns.map(col => (
              <th key={col.key} onClick={() => col.sortable && toggleSort(col.key)} className={`py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-on-surface select-none' : ''}`}>
                <span className="flex items-center gap-1">{col.label}{sortKey === col.key && (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}</span>
              </th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-outline-variant">
            {sorted.map((row, i) => (
              <tr key={i} onClick={() => onRowClick?.(row)} className={`hover:bg-surface-container-low/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}>
                {columns.map(col => <td key={col.key} className="py-3 px-4 text-sm">{col.render ? col.render(row[col.key], row) : row[col.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && <div className="text-center py-8 text-sm text-on-surface-variant">No results found</div>}
    </div>
  )
}
