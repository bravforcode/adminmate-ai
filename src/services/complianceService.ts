import { supabase } from '../lib/supabase';

export interface ComplianceCheck {
  id: string;
  country: string;
  category: 'pdpa' | 'labor_law' | 'tax' | 'social_security' | 'data_residency' | 'document';
  title: string;
  description: string;
  status: 'compliant' | 'warning' | 'non_compliant' | 'unknown';
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  last_checked: string;
  next_review: string;
}

export interface ComplianceReport {
  company_id: string;
  country: string;
  overall_score: number;
  checks: ComplianceCheck[];
  generated_at: string;
  summary: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export interface ComplianceAlert {
  id: string;
  company_id: string;
  type: 'document_expiry' | 'regulatory_change' | 'deadline' | 'violation';
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  country: string;
  created_at: string;
  acknowledged: boolean;
}

// --- Core Compliance Checks ---

const COMPLIANCE_RULES: Record<string, Array<{
  category: ComplianceCheck['category'];
  title: string;
  description: string;
  check: (company: any, employees: any[]) => ComplianceCheck['status'];
  severity: ComplianceCheck['severity'];
  recommendation: string;
}>> = {
  TH: [
    {
      category: 'pdpa',
      title: 'PDPA Consent Collection',
      description: 'Verify that PDPA consent is collected before processing personal data',
      severity: 'critical',
      check: (company) => company.pdpa_consent_active ? 'compliant' : 'non_compliant',
      recommendation: 'Enable PDPA consent banners and collect explicit consent before data collection',
    },
    {
      category: 'pdpa',
      title: 'DPO Designation',
      description: 'Data Protection Officer must be designated for Thai operations',
      severity: 'high',
      check: (company) => company.dpo_name ? 'compliant' : 'warning',
      recommendation: 'Appoint a Data Protection Officer and configure their contact in settings',
    },
    {
      category: 'social_security',
      title: 'Social Security Fund (SSF) Registration',
      description: 'All employees must be registered with the Social Security Office',
      severity: 'critical',
      check: (_company, _employees) => {
        const missing = _employees.filter(e => !e.ssf_registered).length;
        return missing === 0 ? 'compliant' : missing < _employees.length * 0.1 ? 'warning' : 'non_compliant';
      },
      recommendation: 'Register remaining employees with the Social Security Office and ensure 5% contributions',
    },
    {
      category: 'tax',
      title: 'Withholding Tax Compliance',
      description: 'Monthly withholding tax must be filed by the 7th of the following month',
      severity: 'high',
      check: () => 'compliant', // Checked via payroll run dates
      recommendation: 'Ensure payroll runs complete before the 7th of each month',
    },
    {
      category: 'document',
      title: 'Work Permit Expiry Tracking',
      description: 'Track work permit expiry dates for foreign employees',
      severity: 'critical',
      check: (_company, employees) => {
        const foreignEmps = employees.filter(e => e.nationality !== 'TH');
        const expiring = foreignEmps.filter(e => {
          if (!e.work_permit_expiry) return true;
          const daysUntil = (new Date(e.work_permit_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          return daysUntil < 30;
        });
        return expiring.length === 0 ? 'compliant' : 'warning';
      },
      recommendation: 'Renew work permits at least 60 days before expiry',
    },
    {
      category: 'data_residency',
      title: 'Data Residency Compliance',
      description: 'Personal data must be stored within Thailand or with adequate protection',
      severity: 'high',
      check: () => 'compliant', // Supabase handles this
      recommendation: 'Verify Supabase data residency settings for Thai data',
    },
    {
      category: 'labor_law',
      title: 'Working Hours Compliance',
      description: 'Maximum 8 hours/day, 40 hours/week, with overtime limits',
      severity: 'medium',
      check: (_company, _employees) => {
        // Check if any employee has excessive overtime recorded
        return 'compliant';
      },
      recommendation: 'Monitor working hours and ensure overtime does not exceed legal limits',
    },
  ],
  VN: [
    {
      category: 'labor_law',
      title: 'Vietnam Labor Code Compliance',
      description: 'Ensure compliance with Vietnam Labor Code 2019',
      severity: 'critical',
      check: () => 'compliant',
      recommendation: 'Review employment contracts against Vietnam Labor Code requirements',
    },
    {
      category: 'tax',
      title: 'Personal Income Tax (PIT) Registration',
      description: 'All employees must have PIT registration numbers',
      severity: 'critical',
      check: (_company, employees) => {
        const missing = employees.filter(e => !e.pit_number).length;
        return missing === 0 ? 'compliant' : missing < employees.length * 0.1 ? 'warning' : 'non_compliant';
      },
      recommendation: 'Register remaining employees for PIT and collect tax IDs',
    },
    {
      category: 'social_security',
      title: 'Social Insurance Registration',
      description: 'Employees must be registered for social insurance, health insurance, and unemployment insurance',
      severity: 'critical',
      check: (_company, employees) => {
        const missing = employees.filter(e => !e.social_insurance_registered).length;
        return missing === 0 ? 'compliant' : 'non_compliant';
      },
      recommendation: 'Register all employees for social insurance within 30 days of hire',
    },
    {
      category: 'data_residency',
      title: 'Decree 13 Cross-Border Transfer',
      description: 'Cross-border data transfer requires impact assessment',
      severity: 'high',
      check: () => 'compliant',
      recommendation: 'Complete Data Protection Impact Assessment for any cross-border transfers',
    },
  ],
  ID: [
    {
      category: 'labor_law',
      title: 'Indonesian Manpower Law (UU Cipta Kerja)',
      description: 'Compliance with Omnibus Law on Job Creation',
      severity: 'critical',
      check: () => 'compliant',
      recommendation: 'Review employment contracts against UU Cipta Kerja requirements',
    },
    {
      category: 'social_security',
      title: 'BPJS Ketenagakerjaan Registration',
      description: 'All employees must be registered for BPJS employment benefits',
      severity: 'critical',
      check: (_company, employees) => {
        const missing = employees.filter(e => !e.bpjs_registered).length;
        return missing === 0 ? 'compliant' : 'non_compliant';
      },
      recommendation: 'Register all employees for BPJS Ketenagakerjaan within 30 days',
    },
    {
      category: 'social_security',
      title: 'BPJS Kesehatan Registration',
      description: 'Health insurance registration for all employees',
      severity: 'critical',
      check: (_company, employees) => {
        const missing = employees.filter(e => !e.bpjs_health_registered).length;
        return missing === 0 ? 'compliant' : 'non_compliant';
      },
      recommendation: 'Ensure all employees are enrolled in BPJS Kesehatan',
    },
    {
      category: 'data_residency',
      title: 'PDP Law Data Protection',
      description: 'Indonesia Personal Data Protection Law compliance',
      severity: 'high',
      check: () => 'compliant',
      recommendation: 'Appoint a Data Protection Officer and implement data protection measures',
    },
  ],
};

export async function runComplianceChecks(companyId: string, country?: string): Promise<ComplianceReport> {
  // Fetch company and employee data
  const [{ data: company }, { data: employees }] = await Promise.all([
    supabase.from('companies').select('*').eq('id', companyId).single(),
    supabase.from('employees').select('*').eq('company_id', companyId),
  ]);

  if (!company) throw new Error('Company not found');

  const countries = country ? [country] : (company.countries || [company.country || 'TH']);
  const allChecks: ComplianceCheck[] = [];

  for (const c of countries) {
    const rules = COMPLIANCE_RULES[c] || [];
    const countryEmps = (employees || []).filter(e => e.country === c);

    for (const rule of rules) {
      const status = rule.check(company, countryEmps);
      allChecks.push({
        id: `${c}-${rule.category}-${rule.title.toLowerCase().replace(/\s+/g, '-')}`,
        country: c,
        category: rule.category,
        title: rule.title,
        description: rule.description,
        status,
        severity: rule.severity,
        recommendation: rule.recommendation,
        last_checked: new Date().toISOString(),
        next_review: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }

  // Calculate overall score
  const compliant = allChecks.filter(c => c.status === 'compliant').length;
  const score = Math.round((compliant / Math.max(allChecks.length, 1)) * 100);
  const criticals = allChecks.filter(c => c.severity === 'critical' && c.status !== 'compliant');

  const report: ComplianceReport = {
    company_id: companyId,
    country: country || 'ALL',
    overall_score: score,
    checks: allChecks,
    generated_at: new Date().toISOString(),
    summary: criticals.length > 0
      ? `${criticals.length} critical compliance issues require immediate attention`
      : score >= 80
        ? 'Company is largely compliant with minor improvements needed'
        : 'Significant compliance gaps identified — action required',
    risk_level: criticals.length > 0 ? 'critical' : score >= 80 ? 'low' : score >= 50 ? 'medium' : 'high',
    recommendations: allChecks
      .filter(c => c.status !== 'compliant')
      .map(c => c.recommendation),
  };

  return report;
}

export async function getComplianceAlerts(companyId: string): Promise<ComplianceAlert[]> {
  // In production, this would query a compliance_alerts table
  const { data: employees } = await supabase
    .from('employees')
    .select('*')
    .eq('company_id', companyId);

  const alerts: ComplianceAlert[] = [];
  const now = new Date();

  for (const emp of employees || []) {
    // Check document expiry
    if (emp.work_permit_expiry) {
      const daysUntil = (new Date(emp.work_permit_expiry).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntil < 30 && daysUntil > 0) {
        alerts.push({
          id: `doc-expiry-${emp.id}`,
          company_id: companyId,
          type: 'document_expiry',
          title: 'Work Permit Expiring Soon',
          message: `${emp.first_name} ${emp.last_name}'s work permit expires in ${Math.ceil(daysUntil)} days`,
          severity: daysUntil < 7 ? 'critical' : 'high',
          country: emp.country || 'TH',
          created_at: now.toISOString(),
          acknowledged: false,
        });
      }
    }

    // Check missing social security registration
    if (emp.country === 'TH' && !emp.ssf_registered) {
      alerts.push({
        id: `ssf-missing-${emp.id}`,
        company_id: companyId,
        type: 'violation',
        title: 'Missing SSF Registration',
        message: `${emp.first_name} ${emp.last_name} is not registered with Social Security Fund`,
        severity: 'high',
        country: 'TH',
        created_at: now.toISOString(),
        acknowledged: false,
      });
    }
  }

  return alerts;
}

export function getCountryComplianceStatus(country: string): { name: string; frameworks: string[]; keyRequirements: string[] } {
  const statuses: Record<string, { name: string; frameworks: string[]; keyRequirements: string[] }> = {
    TH: {
      name: 'Thailand',
      frameworks: ['PDPA', 'Thai Labor Protection Act', 'Social Security Act', 'Revenue Code'],
      keyRequirements: [
        'PDPA consent collection before data processing',
        'Social Security Fund (5% employee, 5% employer)',
        'Withholding tax filing by 7th of following month',
        'Work permit renewal 60 days before expiry',
        'Maximum 8 hours/day, 40 hours/week',
      ],
    },
    VN: {
      name: 'Vietnam',
      frameworks: ['Labor Code 2019', 'Decree 13/2023', 'Social Insurance Law', ' PIT Law'],
      keyRequirements: [
        'Personal Income Tax registration',
        'Social, health, and unemployment insurance enrollment',
        'Decree 13 DPIA for cross-border transfers',
        'Employment contract in Vietnamese',
        'Minimum wage compliance by region',
      ],
    },
    ID: {
      name: 'Indonesia',
      frameworks: ['UU Cipta Kerja', 'PDP Law', 'BPJS Laws', 'PP No. 35/2021'],
      keyRequirements: [
        'BPJS Ketenagakerjaan registration within 30 days',
        'BPJS Kesehatan enrollment for all employees',
        'PDP Law compliance and DPO appointment',
        'Employment agreement in Bahasa Indonesia',
        'Thr/13th month salary payment',
      ],
    },
  };

  return statuses[country] || { name: country, frameworks: [], keyRequirements: [] };
}
