import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart2,
  TrendingUp,
  Users,
  Clock,
  FileText,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

interface AnalyticsMetric {
  label: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
  color: string;
}

interface HiringFunnel {
  stage: string;
  count: number;
  percentage: number;
}

interface DepartmentHeadcount {
  department: string;
  count: number;
  percentage: number;
}

interface TurnoverData {
  month: string;
  rate: number;
}

export default function AnalyticsDashboardPage() {
  const { profile } = useAuthStore();
  const [metrics, setMetrics] = useState<AnalyticsMetric[]>([]);
  const [hiringFunnel, setHiringFunnel] = useState<HiringFunnel[]>([]);
  const [departmentHeadcount, setDepartmentHeadcount] = useState<DepartmentHeadcount[]>([]);
  const [turnoverData, setTurnoverData] = useState<TurnoverData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    fetchAnalytics();
  }, [profile?.company_id, timeRange]);

  const fetchAnalytics = async () => {
    if (!profile?.company_id) return;

    try {
      // Fetch employees for headcount
      const { data: employees } = await supabase
        .from('employees')
        .select('department, status')
        .eq('company_id', profile.company_id);

      // Fetch candidates for hiring funnel
      const { data: candidates } = await supabase
        .from('candidates')
        .select('status')
        .eq('company_id', profile.company_id);

      // Calculate department headcount
      const deptMap = new Map<string, number>();
      (employees || []).forEach(emp => {
        const dept = emp.department || 'Unassigned';
        deptMap.set(dept, (deptMap.get(dept) || 0) + 1);
      });

      const totalEmployees = employees?.length || 1;
      const deptData = Array.from(deptMap.entries())
        .map(([department, count]) => ({
          department,
          count,
          percentage: Math.round((count / totalEmployees) * 100),
        }))
        .sort((a, b) => b.count - a.count);

      // Calculate hiring funnel
      const statusCounts = new Map<string, number>();
      (candidates || []).forEach(c => {
        statusCounts.set(c.status || 'unknown', (statusCounts.get(c.status || 'unknown') || 0) + 1);
      });

      const funnelData: HiringFunnel[] = [
        { stage: 'Applied', count: statusCounts.get('applied') || 0, percentage: 100 },
        { stage: 'Screening', count: statusCounts.get('screening') || 0, percentage: 0 },
        { stage: 'Interview', count: statusCounts.get('interview') || 0, percentage: 0 },
        { stage: 'Offer', count: statusCounts.get('offer') || 0, percentage: 0 },
        { stage: 'Hired', count: statusCounts.get('hired') || 0, percentage: 0 },
      ];

      const maxCount = Math.max(...funnelData.map(f => f.count), 1);
      funnelData.forEach(f => {
        f.percentage = Math.round((f.count / maxCount) * 100);
      });

      // Mock turnover data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const turnoverData: TurnoverData[] = months.map(month => ({
        month,
        rate: Math.round((Math.random() * 3 + 2) * 10) / 10,
      }));

      // Set metrics
      setMetrics([
        {
          label: 'Total Employees',
          value: employees?.length || 0,
          change: 12,
          trend: 'up',
          icon: Users,
          color: 'bg-blue-500',
        },
        {
          label: 'Active Candidates',
          value: candidates?.length || 0,
          change: 8,
          trend: 'up',
          icon: FileText,
          color: 'bg-green-500',
        },
        {
          label: 'Avg. Time to Hire',
          value: '18 days',
          change: -3,
          trend: 'down',
          icon: Clock,
          color: 'bg-purple-500',
        },
        {
          label: 'Turnover Rate',
          value: `${turnoverData[turnoverData.length - 1]?.rate || 0}%`,
          change: -0.5,
          trend: 'down',
          icon: TrendingUp,
          color: 'bg-amber-500',
        },
      ]);

      setDepartmentHeadcount(deptData);
      setHiringFunnel(funnelData);
      setTurnoverData(turnoverData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-3">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-6 h-6 text-blue-500" />
                Analytics Dashboard
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                HR metrics and insights at a glance
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                {(['week', 'month', 'quarter', 'year'] as const).map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      timeRange === range
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 ${metric.color} rounded-xl flex items-center justify-center`}>
                      <metric.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {metric.trend === 'up' ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {Math.abs(metric.change)}%
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{metric.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hiring Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Hiring Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {hiringFunnel.map((stage, i) => (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{stage.stage}</span>
                      <span className="text-sm text-gray-500">{stage.count}</span>
                    </div>
                    <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stage.percentage}%` }}
                        transition={{ delay: i * 0.1, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-end pr-2"
                      >
                        {stage.percentage > 20 && (
                          <span className="text-xs text-white font-medium">{stage.percentage}%</span>
                        )}
                      </motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Department Headcount */}
          <Card>
            <CardHeader>
              <CardTitle>Department Headcount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {departmentHeadcount.map((dept, i) => (
                  <div key={dept.department} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 dark:text-gray-300 w-32 truncate">{dept.department}</span>
                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${dept.percentage}%` }}
                        transition={{ delay: i * 0.05, duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">{dept.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Turnover Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Turnover Rate Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-48">
                {turnoverData.map((data, i) => (
                  <div key={data.month} className="flex-1 flex flex-col items-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(data.rate / 10) * 100}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      className="w-full bg-gradient-to-t from-amber-500 to-orange-500 rounded-t-lg"
                    />
                    <span className="text-xs text-gray-500 mt-2">{data.month}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-500">Average: {(turnoverData.reduce((a, b) => a + b.rate, 0) / turnoverData.length).toFixed(1)}%</span>
                <span className="text-green-600 font-medium">Below industry avg (8.2%)</span>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-purple-500">✨</span>
                AI Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Hiring Speed:</strong> Your time-to-hire has improved by 14% over the last quarter. The Engineering department is the fastest at 12 days average.
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <strong>Retention:</strong> Your turnover rate (3.2%) is well below the industry average (8.2%). The Sales department shows the highest retention.
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <strong>Recommendation:</strong> Consider increasing the Engineering team headcount by 20% to meet projected Q2 workload.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benchmark Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Industry Benchmark Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Your Company</p>
                <p className="text-3xl font-bold text-blue-600">3.2%</p>
                <p className="text-sm text-gray-500">Turnover Rate</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Industry Average</p>
                <p className="text-3xl font-bold text-gray-400">8.2%</p>
                <p className="text-sm text-gray-500">Turnover Rate</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-2">Top Performers</p>
                <p className="text-3xl font-bold text-green-600">2.8%</p>
                <p className="text-sm text-gray-500">Turnover Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
