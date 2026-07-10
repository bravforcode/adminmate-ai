/* ============================================================
   Country Payroll Strategy Interface + Registry
   Strategy pattern for per-country payroll calculation.
   Each country plugs in as a calculator implementation.
   ============================================================ */

// ── Types ───────────────────────────────────────────────────

export interface PayrollRunItemInput {
  employee_id: string
  base_salary: number
  overtime_pay: number
  bonus: number
  other_earnings: number
  other_deductions: number
}

export interface PayrollCalculationResult {
  social_security_employee: number
  social_security_employer: number
  withholding_tax: number
  total_deductions: number
  net_pay: number
  /** Country-specific extra fields (e.g., BPJS, Tapera) */
  extras?: Record<string, number>
}

export interface CountryPayrollStrategy {
  /** ISO 3166-1 alpha-2 country code */
  countryCode: string

  /** Human-readable country name */
  countryName: string

  /**
   * Calculate payroll for a single employee.
   * Pure function — no side effects, no DB calls.
   */
  calculate(item: PayrollRunItemInput, context: PayrollContext): PayrollCalculationResult

  /**
   * Validate that the company has required configuration for this country.
   * Throw if config is missing/invalid.
   */
  validateConfig(config: Record<string, unknown>): void

  /**
   * Return the database tables needed for this country's compliance data.
   * Used by migrations and schema validation.
   */
  getRequiredTables(): string[]
}

export interface PayrollContext {
  companyId: string
  country: string
  /** Year for tax bracket lookup */
  year: number
  /** Country-specific config from company_settings or similar */
  config: Record<string, unknown>
}

// ── Registry ────────────────────────────────────────────────

const strategies = new Map<string, CountryPayrollStrategy>()

export function registerPayrollStrategy(strategy: CountryPayrollStrategy): void {
  strategies.set(strategy.countryCode, strategy)
}

export function getPayrollStrategy(countryCode: string): CountryPayrollStrategy | undefined {
  return strategies.get(countryCode)
}

export function getAvailableCountries(): Array<{ code: string; name: string }> {
  return Array.from(strategies.values()).map(s => ({
    code: s.countryCode,
    name: s.countryName,
  }))
}

/**
 * Calculate payroll using the registered strategy for the given country.
 * Throws if no strategy is registered for the country.
 */
export function calculatePayroll(
  item: PayrollRunItemInput,
  context: PayrollContext
): PayrollCalculationResult {
  const strategy = getPayrollStrategy(context.country)
  if (!strategy) {
    throw new Error(`No payroll strategy registered for country: ${context.country}`)
  }
  return strategy.calculate(item, context)
}
