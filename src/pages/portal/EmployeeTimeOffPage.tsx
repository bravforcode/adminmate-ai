import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string;
  created_at: string;
}

interface LeaveBalance {
  leave_type: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
}

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave', color: 'bg-blue-500' },
  { value: 'sick', label: 'Sick Leave', color: 'bg-red-500' },
  { value: 'personal', label: 'Personal Leave', color: 'bg-purple-500' },
  { value: 'maternity', label: 'Maternity Leave', color: 'bg-pink-500' },
  { value: 'paternity', label: 'Paternity Leave', color: 'bg-indigo-500' },
  { value: 'bereavement', label: 'Bereavement Leave', color: 'bg-surface-sunken0' },
];

export default function EmployeeTimeOffPage() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Form state
  const [formData, setFormData] = useState({
    leave_type: 'annual',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;

    try {
      // Fetch leave requests
      const { data: requestsData } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch leave balances
      const { data: balanceData } = await supabase
        .from('leave_balances')
        .select('*')
        .eq('employee_id', user.id)
        .eq('year', new Date().getFullYear());

      setRequests(requestsData || []);
      setBalance(balanceData || []);
    } catch (error) {
      console.error('Failed to fetch leave data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSubmitting(true);
    try {
      const days = calculateDays(formData.start_date, formData.end_date);

      const { error } = await supabase.from('leave_requests').insert({
        employee_id: user.id,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days,
        reason: formData.reason,
        status: 'pending',
      });

      if (error) throw error;

      setShowRequestForm(false);
      setFormData({ leave_type: 'annual', start_date: '', end_date: '', reason: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to submit leave request:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(r => filter === 'all' || r.status === filter);

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  const statusIcons = {
    pending: Clock,
    approved: CheckCircle2,
    rejected: XCircle,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-sunken dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-ink-muted mt-3">Loading leave data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken dark:bg-gray-900">
      {/* Header */}
      <div className="bg-surface dark:bg-gray-800 border-b border-border dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ink dark:text-white">Time Off</h1>
              <p className="text-ink-muted dark:text-ink-faint mt-1">
                Request and manage your leave
              </p>
            </div>
            <Button onClick={() => setShowRequestForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Request Leave
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Leave Balance */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {LEAVE_TYPES.map((type) => {
            const bal = balance.find(b => b.leave_type === type.value);
            return (
              <Card key={type.value}>
                <CardContent className="p-4">
                  <div className={`w-2 h-2 rounded-full ${type.color} mb-2`} />
                  <p className="text-xs text-ink-muted">{type.label}</p>
                  <p className="text-lg font-bold text-ink dark:text-white">
                    {bal?.remaining_days || 0}
                  </p>
                  <p className="text-xs text-ink-faint">days left</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-ink-muted" />
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-500 text-white'
                  : 'bg-surface-sunken dark:bg-gray-800 text-ink-muted dark:text-ink-faint hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="ml-1">
                  ({requests.filter(r => r.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Request List */}
        <Card>
          <CardContent className="p-0">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-ink-muted">No leave requests found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredRequests.map((request) => {
                  const StatusIcon = statusIcons[request.status];
                  return (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-4 hover:bg-surface-sunken dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-surface-sunken dark:bg-gray-800 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-ink-muted" />
                          </div>
                          <div>
                            <p className="font-medium text-ink dark:text-white">
                              {LEAVE_TYPES.find(t => t.value === request.leave_type)?.label || request.leave_type}
                            </p>
                            <p className="text-sm text-ink-muted">
                              {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                              <span className="ml-2 text-ink-faint">({request.days} days)</span>
                            </p>
                            {request.reason && (
                              <p className="text-sm text-ink-faint mt-1">{request.reason}</p>
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}>
                          <StatusIcon className="w-3 h-3 inline mr-1" />
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Form Modal */}
      <AnimatePresence>
        {showRequestForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRequestForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h2 className="text-xl font-bold text-ink dark:text-white mb-4">
                  Request Leave
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                      Leave Type
                    </label>
                    <select
                      value={formData.leave_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, leave_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-ink dark:text-white"
                    >
                      {LEAVE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-ink dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                        required
                        className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-ink dark:text-white"
                      />
                    </div>
                  </div>
                  {formData.start_date && formData.end_date && (
                    <p className="text-sm text-primary">
                      {calculateDays(formData.start_date, formData.end_date)} day(s)
                    </p>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                      Reason (optional)
                    </label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-700 text-ink dark:text-white"
                      placeholder="Reason for leave..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowRequestForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1" disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
