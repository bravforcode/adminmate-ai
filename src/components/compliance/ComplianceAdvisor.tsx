import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import {
  runComplianceChecks,
  getComplianceAlerts,
  getCountryComplianceStatus,
  type ComplianceReport,
  type ComplianceCheck,
  type ComplianceAlert,
} from '../../services/complianceService';
import { useAuthStore } from '../../stores/authStore';

// --- Compliance Status Badge ---
function StatusBadge({ status }: { status: ComplianceCheck['status'] }) {
  const config = {
    compliant: { icon: CheckCircle2, color: 'text-success', bg: 'bg-green-50 dark:bg-green-950/30' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    non_compliant: { icon: XCircle, color: 'text-destructive', bg: 'bg-red-50 dark:bg-red-950/30' },
    unknown: { icon: FileText, color: 'text-ink-muted', bg: 'bg-surface-sunken dark:bg-gray-950/30' },
  };
  const { icon: Icon, color, bg } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${color}`}>
      <Icon className="w-3 h-3" />
      {status.replace('_', ' ')}
    </span>
  );
}

// --- Severity Indicator ---
function SeverityDot({ severity }: { severity: ComplianceCheck['severity'] }) {
  const colors = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };
  return <span className={`w-2 h-2 rounded-full ${colors[severity]}`} />;
}

// --- Check Card ---
function CheckCard({ check }: { check: ComplianceCheck }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border dark:border-gray-700 rounded-lg p-4 hover:bg-surface-sunken dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <SeverityDot severity={check.severity} />
          <div className="min-w-0">
            <p className="font-medium text-ink dark:text-white text-sm">{check.title}</p>
            <p className="text-xs text-ink-muted dark:text-ink-faint truncate">{check.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={check.status} />
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <p className="text-sm text-ink-secondary dark:text-gray-300">
                <strong>Recommendation:</strong> {check.recommendation}
              </p>
              <div className="flex items-center gap-4 text-xs text-ink-muted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last checked: {new Date(check.last_checked).toLocaleDateString()}
                </span>
                <span>Next review: {new Date(check.next_review).toLocaleDateString()}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Alert Item ---
function AlertItem({ alert }: { alert: ComplianceAlert }) {
  const severityColors = {
    critical: 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20',
    high: 'border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20',
    medium: 'border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20',
    low: 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20',
  };

  return (
    <div className={`border-l-4 p-3 rounded-r-lg ${severityColors[alert.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-sm text-ink dark:text-white">{alert.title}</p>
          <p className="text-xs text-ink-muted dark:text-ink-faint mt-0.5">{alert.message}</p>
        </div>
        <span className="text-xs text-ink-muted whitespace-nowrap">
          {new Date(alert.created_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

// --- Main Compliance Advisor Component ---
export function ComplianceAdvisor() {
  const { profile } = useAuthStore();
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'checks' | 'alerts'>('overview');

  const companyId = profile?.company_id || '';

  const fetchData = async () => {
    if (!companyId) return;
    try {
      const [reportData, alertsData] = await Promise.all([
        runComplianceChecks(companyId),
        getComplianceAlerts(companyId),
      ]);
      setReport(reportData);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-ink-faint" />
          <p className="text-ink-muted mt-2">Running compliance checks...</p>
        </CardContent>
      </Card>
    );
  }

  const riskColors = {
    low: 'text-success bg-green-50 dark:bg-green-950/30',
    medium: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30',
    high: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30',
    critical: 'text-destructive bg-red-50 dark:bg-red-950/30',
  };

  const checksByCountry = report?.checks.reduce((acc, check) => {
    if (!acc[check.country]) acc[check.country] = [];
    acc[check.country].push(check);
    return acc;
  }, {} as Record<string, ComplianceCheck[]>) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            AI Compliance Advisor
          </h2>
          <p className="text-ink-muted dark:text-ink-faint mt-1">
            Real-time compliance monitoring across all regions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Score Overview */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <div className={`text-4xl font-bold ${report.overall_score >= 80 ? 'text-success' : report.overall_score >= 50 ? 'text-amber-600' : 'text-destructive'}`}>
                {report.overall_score}%
              </div>
              <p className="text-sm text-ink-muted mt-1">Overall Score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${riskColors[report.risk_level]}`}>
                {report.risk_level.toUpperCase()}
              </div>
              <p className="text-sm text-ink-muted mt-2">Risk Level</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-ink dark:text-white">
                {report.checks.filter(c => c.status === 'compliant').length}/{report.checks.length}
              </div>
              <p className="text-sm text-ink-muted mt-1">Checks Passed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-4xl font-bold text-amber-600">{alerts.length}</div>
              <p className="text-sm text-ink-muted mt-1">Active Alerts</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-sunken dark:bg-gray-800 p-1 rounded-lg">
        {(['overview', 'checks', 'alerts'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-surface dark:bg-gray-700 text-ink dark:text-white shadow-sm'
                : 'text-ink-muted hover:text-ink-secondary dark:hover:text-gray-300'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'checks' && `Checks (${report?.checks.length || 0})`}
            {tab === 'alerts' && `Alerts (${alerts.length})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {report?.summary && (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-ink-secondary dark:text-gray-300">{report.summary}</p>
                </CardContent>
              </Card>
            )}

            {Object.entries(checksByCountry).map(([country, _checks]) => {
              const countryInfo = getCountryComplianceStatus(country);
              return (
                <Card key={country}>
                  <CardHeader>
                    <CardTitle className="text-lg">{countryInfo.name} Compliance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">Frameworks</p>
                        <div className="flex flex-wrap gap-2">
                          {countryInfo.frameworks.map(f => (
                            <span key={f} className="px-2 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-2">Key Requirements</p>
                        <ul className="space-y-1">
                          {countryInfo.keyRequirements.map((req, i) => (
                            <li key={i} className="text-sm text-ink-muted dark:text-ink-faint flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'checks' && (
          <motion.div
            key="checks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {Object.entries(checksByCountry).map(([country, checks]) => (
              <div key={country}>
                <h3 className="text-sm font-medium text-ink-muted uppercase tracking-wide mb-3">{country}</h3>
                <div className="space-y-2">
                  {checks.map(check => (
                    <CheckCard key={check.id} check={check} />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'alerts' && (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {alerts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" />
                  <p className="text-ink-muted">No active compliance alerts</p>
                </CardContent>
              </Card>
            ) : (
              alerts.map(alert => (
                <AlertItem key={alert.id} alert={alert} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
