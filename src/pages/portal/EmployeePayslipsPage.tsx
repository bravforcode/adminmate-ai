import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Download,
  DollarSign,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Printer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

interface Payslip {
  id: string;
  pay_period: string;
  pay_date: string;
  gross_salary: number;
  deductions: number;
  net_pay: number;
  currency: string;
  status: 'draft' | 'final' | 'paid';
  items: PayslipItem[];
}

interface PayslipItem {
  category: 'earnings' | 'deductions';
  label: string;
  amount: number;
}

export default function EmployeePayslipsPage() {
  const { user } = useAuthStore();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPayslips();
  }, [user?.id]);

  const fetchPayslips = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('payroll_runs')
        .select('*')
        .eq('employee_id', user.id)
        .order('pay_date', { ascending: false });

      // Mock payslip data if none exists
      if (!data || data.length === 0) {
        setPayslips([
          {
            id: '1',
            pay_period: 'November 2024',
            pay_date: '2024-11-30',
            gross_salary: 50000,
            deductions: 7500,
            net_pay: 42500,
            currency: 'THB',
            status: 'paid',
            items: [
              { category: 'earnings', label: 'Base Salary', amount: 50000 },
              { category: 'earnings', label: 'Overtime', amount: 2500 },
              { category: 'deductions', label: 'Social Security (SSF)', amount: -1500 },
              { category: 'deductions', label: 'Withholding Tax', amount: -4500 },
              { category: 'deductions', label: 'Health Insurance', amount: -1500 },
            ],
          },
          {
            id: '2',
            pay_period: 'October 2024',
            pay_date: '2024-10-31',
            gross_salary: 50000,
            deductions: 6000,
            net_pay: 44000,
            currency: 'THB',
            status: 'paid',
            items: [
              { category: 'earnings', label: 'Base Salary', amount: 50000 },
              { category: 'deductions', label: 'Social Security (SSF)', amount: -1500 },
              { category: 'deductions', label: 'Withholding Tax', amount: -3000 },
              { category: 'deductions', label: 'Health Insurance', amount: -1500 },
            ],
          },
          {
            id: '3',
            pay_period: 'September 2024',
            pay_date: '2024-09-30',
            gross_salary: 50000,
            deductions: 5500,
            net_pay: 44500,
            currency: 'THB',
            status: 'paid',
            items: [
              { category: 'earnings', label: 'Base Salary', amount: 50000 },
              { category: 'deductions', label: 'Social Security (SSF)', amount: -1500 },
              { category: 'deductions', label: 'Withholding Tax', amount: -2500 },
              { category: 'deductions', label: 'Health Insurance', amount: -1500 },
            ],
          },
        ]);
      } else {
        setPayslips(data);
      }
    } catch (error) {
      console.error('Failed to fetch payslips:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'THB') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statusColors = {
    draft: 'bg-surface-sunken text-ink-secondary dark:bg-gray-800 dark:text-gray-300',
    final: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-sunken dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-ink-muted mt-3">Loading payslips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken dark:bg-gray-900">
      {/* Header */}
      <div className="bg-surface dark:bg-gray-800 border-b border-border dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-ink dark:text-white">Payslips</h1>
          <p className="text-ink-muted dark:text-ink-faint mt-1">
            View and download your payslips
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-ink dark:text-white">
                {payslips.length > 0 ? formatCurrency(payslips[0].net_pay, payslips[0].currency) : '-'}
              </p>
              <p className="text-xs text-ink-muted">Latest Net Pay</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingDown className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-2xl font-bold text-ink dark:text-white">
                {payslips.length > 0 ? formatCurrency(payslips[0].deductions, payslips[0].currency) : '-'}
              </p>
              <p className="text-xs text-ink-muted">Latest Deductions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-ink dark:text-white">{payslips.length}</p>
              <p className="text-xs text-ink-muted">Total Payslips</p>
            </CardContent>
          </Card>
        </div>

        {/* Payslip List */}
        <Card>
          <CardHeader>
            <CardTitle>Payslip History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {payslips.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-ink-muted">No payslips available yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {payslips.map((payslip) => (
                  <div key={payslip.id}>
                    <div
                      className="p-4 hover:bg-surface-sunken dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === payslip.id ? null : payslip.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-ink dark:text-white">
                              {payslip.pay_period}
                            </p>
                            <p className="text-sm text-ink-muted">
                              Paid: {new Date(payslip.pay_date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-success dark:text-green-400">
                              {formatCurrency(payslip.net_pay, payslip.currency)}
                            </p>
                            <p className="text-xs text-ink-faint">net pay</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[payslip.status]}`}>
                            {payslip.status.charAt(0).toUpperCase() + payslip.status.slice(1)}
                          </span>
                          {expandedId === payslip.id ? (
                            <ChevronUp className="w-5 h-5 text-ink-faint" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-ink-faint" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedId === payslip.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="bg-surface-sunken dark:bg-gray-800/50 px-4 py-4"
                      >
                        <div className="grid grid-cols-2 gap-6">
                          {/* Earnings */}
                          <div>
                            <h4 className="text-sm font-medium text-ink-muted mb-3">Earnings</h4>
                            <div className="space-y-2">
                              {payslip.items
                                .filter(i => i.category === 'earnings')
                                .map((item, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="text-ink-muted dark:text-ink-faint">{item.label}</span>
                                    <span className="font-medium text-ink dark:text-white">
                                      {formatCurrency(item.amount, payslip.currency)}
                                    </span>
                                  </div>
                                ))}
                              <div className="border-t border-border dark:border-gray-700 pt-2 mt-2">
                                <div className="flex justify-between text-sm font-medium">
                                  <span>Gross Salary</span>
                                  <span>{formatCurrency(payslip.gross_salary, payslip.currency)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Deductions */}
                          <div>
                            <h4 className="text-sm font-medium text-ink-muted mb-3">Deductions</h4>
                            <div className="space-y-2">
                              {payslip.items
                                .filter(i => i.category === 'deductions')
                                .map((item, i) => (
                                  <div key={i} className="flex justify-between text-sm">
                                    <span className="text-ink-muted dark:text-ink-faint">{item.label}</span>
                                    <span className="font-medium text-destructive dark:text-red-400">
                                      {formatCurrency(Math.abs(item.amount), payslip.currency)}
                                    </span>
                                  </div>
                                ))}
                              <div className="border-t border-border dark:border-gray-700 pt-2 mt-2">
                                <div className="flex justify-between text-sm font-medium">
                                  <span>Total Deductions</span>
                                  <span className="text-destructive">
                                    {formatCurrency(payslip.deductions, payslip.currency)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Net Pay */}
                        <div className="mt-4 pt-4 border-t border-border dark:border-gray-700">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-ink dark:text-white">Net Pay</span>
                            <span className="text-2xl font-bold text-success dark:text-green-400">
                              {formatCurrency(payslip.net_pay, payslip.currency)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                          </Button>
                          <Button variant="outline" size="sm">
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
