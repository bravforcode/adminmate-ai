import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import {
  Calculator,
  Save,
  DollarSign,
  MapPin,
  Receipt,
  Users,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  FileText,
  ArrowRight,
  Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import {
  TH_TAX_BRACKETS_2024,
  TH_SS_RULES,
  TH_PROVINCES,
  calculateFullPayroll,
  getCompanyPayrollConfig,
  upsertCompanyPayrollConfig,
} from '../../services/payroll/thailandPayrollService'
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { LoadingState } from '../../components/shared/LoadingState'

export function ThailandPayrollPage() {
  const { t } = useTranslation(['thailand_payroll', 'common'])
  const company = useAuthStore(s => s.company)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [showTaxBrackets, setShowTaxBrackets] = useState(false)
  const [showSSDetails, setShowSSDetails] = useState(false)
  const [previewSalary, setPreviewSalary] = useState(50000)
  const [previewProvince, setPreviewProvince] = useState('BKK')
  const [config, setConfig] = useState({
    pay_period: 'monthly' as 'monthly' | 'biweekly',
    pay_day: 25,
    province: 'BKK',
    ot_weekday_rate: 1.5,
    ot_weekend_rate: 2.0,
    ot_holiday_rate: 3.0,
  })

  // Allowance gap: count employees with dependents/marital data for warning
  const { data: allowanceGapCount } = useQuery({
    queryKey: ['allowance-gap-count', company?.id],
    queryFn: async () => {
      if (!company?.id) return 0
      const { data: employees } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', company.id)
        .eq('employment_status', 'active')
      if (!employees || employees.length === 0) return 0
      const employeeIds = employees.map(e => e.id)
      const { data: taxProfiles } = await supabase
        .from('employee_tax_profiles')
        .select('employee_id, marital_status, number_of_dependents, spouse_allowance, child_allowance')
        .in('employee_id', employeeIds)
      if (!taxProfiles) return 0
      let count = 0
      for (const tp of taxProfiles) {
        if (
          (tp.marital_status && tp.marital_status !== 'single') ||
          (tp.number_of_dependents && tp.number_of_dependents > 0) ||
          (tp.spouse_allowance && tp.spouse_allowance > 0) ||
          (tp.child_allowance && tp.child_allowance > 0)
        ) {
          count++
        }
      }
      return count
    },
    enabled: !!company?.id,
  })

  const { isLoading: configLoading, error: configError } = useQuery({
    queryKey: ['payroll-config', 'TH', company?.id],
    queryFn: async () => {
      if (!company?.id) return null
      const result = await getCompanyPayrollConfig(company.id)
      if (result) {
        setConfig({
          pay_period: result.pay_period || 'monthly',
          pay_day: result.pay_day || 25,
          province: result.province || 'BKK',
          ot_weekday_rate: result.ot_weekday_rate ?? 1.5,
          ot_weekend_rate: result.ot_weekend_rate ?? 2.0,
          ot_holiday_rate: result.ot_holiday_rate ?? 3.0,
        })
      }
      return result
    },
    enabled: !!company?.id,
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error('No company')
      return upsertCompanyPayrollConfig(company.id, config)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-config', 'TH', company?.id] })
      toast.success(t('config_saved'))
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const preview = useMemo(
    () => calculateFullPayroll(previewSalary, previewProvince),
    [previewSalary, previewProvince],
  )

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-headline-md font-bold text-on-surface">Thailand Payroll</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Configure Thai payroll rules, tax brackets, and social security</p>
      </div>

      {/* Quick Navigation to Payroll Module */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => navigate('/payroll')}
          className="flex items-center gap-3 p-4 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors text-left"
        >
          <div className="p-2 rounded-lg bg-primary/10">
            <DollarSign size={20} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface">Payroll Dashboard</p>
            <p className="text-xs text-on-surface-variant">Overview &amp; cost summary</p>
          </div>
          <ArrowRight size={16} className="ml-auto text-on-surface-variant" />
        </button>
        <button
          onClick={() => navigate('/payroll/run')}
          className="flex items-center gap-3 p-4 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors text-left"
        >
          <div className="p-2 rounded-lg bg-green-500/10">
            <Clock size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface">Run Payroll</p>
            <p className="text-xs text-on-surface-variant">Calculate &amp; approve</p>
          </div>
          <ArrowRight size={16} className="ml-auto text-on-surface-variant" />
        </button>
        <button
          onClick={() => navigate('/payroll')}
          className="flex items-center gap-3 p-4 rounded-xl border border-outline-variant bg-surface hover:bg-surface-container-low transition-colors text-left"
        >
          <div className="p-2 rounded-lg bg-blue-500/10">
            <FileText size={20} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface">Payslips</p>
            <p className="text-xs text-on-surface-variant">View &amp; download</p>
          </div>
          <ArrowRight size={16} className="ml-auto text-on-surface-variant" />
        </button>
      </div>

      {/* Loading State */}
      {configLoading && (
        <LoadingState variant="cards" rows={2} message="Loading payroll configuration..." />
      )}

      {/* Error State */}
      {configError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Failed to load payroll configuration: {configError.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Allowance Gap Warning */}
      {allowanceGapCount != null && allowanceGapCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                ⚠️ {t('allowance_gap_warning', { count: allowanceGapCount })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Cycle Config */}
      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <Calculator size={20} className="text-primary" />
          <CardTitle>{t('payroll_cycle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-on-surface-variant">{t('pay_period')}</label>
              <select
                value={config.pay_period}
                onChange={e => setConfig(p => ({ ...p, pay_period: e.target.value as 'monthly' | 'biweekly' }))}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="monthly">{t('monthly')}</option>
                <option value="biweekly">{t('biweekly')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-on-surface-variant">{t('pay_day')}</label>
              <input
                type="number"
                min={1}
                max={31}
                value={config.pay_day}
                onChange={e => setConfig(p => ({ ...p, pay_day: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-on-surface-variant">{t('province')}</label>
              <select
                value={config.province}
                onChange={e => setConfig(p => ({ ...p, province: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                {TH_PROVINCES.map(p => (
                  <option key={p.code} value={p.code}>{p.name} ({p.nameTh})</option>
                ))}
              </select>
            </div>
          </div>

          {/* OT Rates */}
          <div className="mt-4">
            <p className="text-sm font-medium text-on-surface-variant mb-3">Overtime Rates (multiplier)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs mb-1 text-on-surface-variant">Weekday OT</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={config.ot_weekday_rate}
                  onChange={e => setConfig(p => ({ ...p, ot_weekday_rate: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-on-surface-variant">Weekend OT</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={config.ot_weekend_rate}
                  onChange={e => setConfig(p => ({ ...p, ot_weekend_rate: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs mb-1 text-on-surface-variant">Holiday OT</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={config.ot_holiday_rate}
                  onChange={e => setConfig(p => ({ ...p, ot_holiday_rate: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-on-surface-variant mt-2">
              Thai Labor Protection Act §24: Weekday 1.5×, Weekend 2×, Holiday 3×
            </p>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              variant="default"
              size="md"
              icon={<Save size={16} />}
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? t('saving') : t('save_config')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tax Bracket Display */}
      <Card>
        <CardHeader
          className="flex-row items-center justify-between cursor-pointer"
          onClick={() => setShowTaxBrackets(!showTaxBrackets)}
        >
          <div className="flex items-center gap-2">
            <Receipt size={20} className="text-primary" />
            <CardTitle>{t('tax_brackets_title')}</CardTitle>
          </div>
          {showTaxBrackets ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </CardHeader>
        {showTaxBrackets && (
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="text-left py-2 px-3 text-on-surface-variant font-medium">{t('income_range')}</th>
                    <th className="text-right py-2 px-3 text-on-surface-variant font-medium">{t('tax_rate')}</th>
                    <th className="text-right py-2 px-3 text-on-surface-variant font-medium">{t('example_tax')}</th>
                  </tr>
                </thead>
                <tbody>
                  {TH_TAX_BRACKETS_2024.map((b, i) => (
                    <tr key={i} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low">
                      <td className="py-2 px-3">
                        {b.min.toLocaleString()} – {b.max ? b.max.toLocaleString() : '∞'} THB
                      </td>
                      <td className="py-2 px-3 text-right font-medium">{b.rate}%</td>
                      <td className="py-2 px-3 text-right text-on-surface-variant">
                        {b.max ? `≤ ${((b.max - b.min) * b.rate / 100).toLocaleString()} THB` : t('progressive')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Social Security Calculator */}
      <Card>
        <CardHeader
          className="flex-row items-center justify-between cursor-pointer"
          onClick={() => setShowSSDetails(!showSSDetails)}
        >
          <div className="flex items-center gap-2">
            <Users size={20} className="text-primary" />
            <CardTitle>{t('ssf_title')}</CardTitle>
          </div>
          {showSSDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </CardHeader>
        {showSSDetails && (
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-surface-container-low rounded-lg">
                <p className="text-xs text-on-surface-variant">{t('employee_rate')}</p>
                <p className="text-lg font-semibold">{TH_SS_RULES.employeeRate}%</p>
              </div>
              <div className="p-3 bg-surface-container-low rounded-lg">
                <p className="text-xs text-on-surface-variant">{t('employer_rate')}</p>
                <p className="text-lg font-semibold">{TH_SS_RULES.employerRate}%</p>
              </div>
              <div className="p-3 bg-surface-container-low rounded-lg">
                <p className="text-xs text-on-surface-variant">{t('salary_cap')}</p>
                <p className="text-lg font-semibold">{TH_SS_RULES.maxSalary.toLocaleString()} THB/mo</p>
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  {t('ss_info', { min: TH_SS_RULES.minSalary.toLocaleString(), max: TH_SS_RULES.maxSalary.toLocaleString(), contribution: TH_SS_RULES.maxSalary * TH_SS_RULES.employeeRate / 100 })}
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Provincial Tax */}
      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <MapPin size={20} className="text-primary" />
          <CardTitle>{t('provincial_tax')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-on-surface-variant mb-3">
            {t('provincial_tax_desc')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TH_PROVINCES.map(p => (
              <div key={p.code} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-container-low">
                <span className="text-sm">{p.name} ({p.nameTh})</span>
                <span className="text-sm font-medium text-on-surface-variant">
                  {p.code === 'BKK' ? '0%' : '0.1%'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payroll Preview */}
      <Card>
        <CardHeader className="flex-row items-center gap-2">
          <DollarSign size={20} className="text-primary" />
          <CardTitle>{t('payroll_preview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1 text-on-surface-variant">{t('monthly_salary')}</label>
              <input
                type="number"
                min={0}
                step={1000}
                value={previewSalary}
                onChange={e => setPreviewSalary(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-on-surface-variant">{t('province')}</label>
              <select
                value={previewProvince}
                onChange={e => setPreviewProvince(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                {TH_PROVINCES.map(p => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
            <div className="flex justify-between py-1"><span className="text-sm text-on-surface-variant">{t('gross_monthly_income')}</span><span className="text-sm font-medium">{preview.grossIncome.toLocaleString()} THB</span></div>
            <div className="border-t border-outline-variant" />
            <div className="flex justify-between py-1"><span className="text-sm text-on-surface-variant">{t('ss_employee')}</span><span className="text-sm font-medium text-red-600">-{preview.socialSecurityEmployee.toLocaleString()} THB</span></div>
            <div className="flex justify-between py-1"><span className="text-sm text-on-surface-variant">{t('withholding_tax')}</span><span className="text-sm font-medium text-red-600">-{preview.withholdingTax.toLocaleString()} THB</span></div>
            <div className="flex justify-between py-1"><span className="text-sm text-on-surface-variant">{t('provincial_tax_monthly')}</span><span className="text-sm font-medium text-red-600">-{preview.provincialTax.toLocaleString()} THB</span></div>
            <div className="border-t border-outline-variant" />
            <div className="flex justify-between py-1"><span className="text-sm text-on-surface-variant">{t('ss_employer')}</span><span className="text-sm font-medium text-blue-600">{preview.socialSecurityEmployer.toLocaleString()} THB</span></div>
            <div className="border-t border-outline-variant" />
            <div className="flex justify-between py-2"><span className="text-sm font-semibold text-on-surface">{t('net_pay')}</span><span className="text-lg font-bold text-primary">{preview.netPay.toLocaleString()} THB</span></div>
            <div className="flex justify-between py-1"><span className="text-xs text-on-surface-variant">{t('effective_tax_rate')}</span><span className="text-xs font-medium">{preview.effectiveTaxRate}%</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ThailandPayrollPage
