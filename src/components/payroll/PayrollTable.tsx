import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, Search } from 'lucide-react'
import type { PayrollRunItem } from '../../services/payroll/payrollRunService'

interface PayrollTableProps {
  items: PayrollRunItem[]
  onViewPayslip?: (employeeId: string) => void
}

type SortKey = 'employee_id' | 'base_salary' | 'overtime_pay' | 'bonus' | 'social_security_employee' | 'Withholding_Tax' | 'net_pay'

export function PayrollTable({ items, onViewPayslip }: PayrollTableProps) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('employee_id')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const filtered = items.filter(i =>
      i.employee_id.toLowerCase().includes(search.toLowerCase()),
    )
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
  }, [items, search, sortKey, sortDir])

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
    ) : null

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          type="text"
          placeholder="Search by employee ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border border-outline-variant">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              {([
                ['employee_id', 'Employee'],
                ['base_salary', 'Base Salary'],
                ['overtime_pay', 'OT Pay'],
                ['bonus', 'Bonus'],
                ['social_security_employee', 'SS'],
                ['Withholding_Tax', 'Tax'],
                ['net_pay', 'Net Pay'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  className="text-left py-2.5 px-3 font-medium text-on-surface-variant cursor-pointer select-none hover:text-on-surface"
                  onClick={() => toggleSort(key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {label} <SortIcon col={key} />
                  </span>
                </th>
              ))}
              {onViewPayslip && <th className="py-2.5 px-3" />}
            </tr>
          </thead>
          <tbody>
            {sorted.map(item => (
              <tr key={item.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors">
                <td className="py-2 px-3 font-mono text-xs">{item.employee_id}</td>
                <td className="py-2 px-3 text-right">{fmt(item.base_salary)}</td>
                <td className="py-2 px-3 text-right">{fmt(item.overtime_pay)}</td>
                <td className="py-2 px-3 text-right">{fmt(item.bonus)}</td>
                <td className="py-2 px-3 text-right text-red-600">-{fmt(item.social_security_employee)}</td>
                <td className="py-2 px-3 text-right text-red-600">-{fmt(item.Withholding_Tax)}</td>
                <td className="py-2 px-3 text-right font-semibold text-primary">{fmt(item.net_pay)}</td>
                {onViewPayslip && (
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={() => onViewPayslip(item.employee_id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Payslip
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={onViewPayslip ? 8 : 7} className="py-8 text-center text-on-surface-variant">
                  No payroll items found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
