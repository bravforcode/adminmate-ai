import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Clock,
  FileText,
  Calendar,
  Bell,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Briefcase,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

interface PortalStats {
  leaveBalance: number;
  pendingTasks: number;
  upcomingHolidays: number;
  unreadNotifications: number;
}

interface RecentActivity {
  id: string;
  type: 'leave_approved' | 'document_signed' | 'payslip_ready' | 'task_completed';
  title: string;
  description: string;
  date: string;
}

export default function EmployeePortalDashboard() {
  const { user, profile } = useAuthStore();
  const [stats, setStats] = useState<PortalStats>({
    leaveBalance: 0,
    pendingTasks: 0,
    upcomingHolidays: 0,
    unreadNotifications: 0,
  });
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortalData();
  }, [user?.id]);

  const fetchPortalData = async () => {
    if (!user?.id) return;

    try {
      // Fetch leave balance
      const { data: leaveBalance } = await supabase
        .from('leave_balances')
        .select('days_remaining')
        .eq('employee_id', user.id)
        .eq('year', new Date().getFullYear())
        .single();

      // Fetch pending tasks
      const { count: pendingTasks } = await supabase
        .from('onboarding_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', user.id)
        .eq('status', 'pending');

      // Fetch notifications
      const { count: unreadNotifications } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setStats({
        leaveBalance: leaveBalance?.days_remaining || 0,
        pendingTasks: pendingTasks || 0,
        upcomingHolidays: 0,
        unreadNotifications: unreadNotifications || 0,
      });

      // Mock recent activities
      setActivities([
        {
          id: '1',
          type: 'leave_approved',
          title: 'Annual Leave Approved',
          description: 'Your leave request for Dec 25-27 has been approved',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          type: 'payslip_ready',
          title: 'November Payslip Ready',
          description: 'Your November 2024 payslip is now available',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          type: 'document_signed',
          title: 'Contract Signed',
          description: 'Your employment contract has been signed',
          date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const activityIcons = {
    leave_approved: CheckCircle2,
    document_signed: FileText,
    payslip_ready: FileText,
    task_completed: CheckCircle2,
  };

  const activityColors = {
    leave_approved: 'text-success bg-green-50 dark:bg-green-950/30',
    document_signed: 'text-primary bg-blue-50 dark:bg-blue-950/30',
    payslip_ready: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30',
    task_completed: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
  };

  const quickActions = [
    {
      icon: Clock,
      label: 'Request Time Off',
      href: '/portal/time-off',
      color: 'bg-blue-500',
    },
    {
      icon: FileText,
      label: 'View Payslips',
      href: '/portal/payslips',
      color: 'bg-success',
    },
    {
      icon: User,
      label: 'Update Profile',
      href: '/portal/profile',
      color: 'bg-purple-500',
    },
    {
      icon: Calendar,
      label: 'View Schedule',
      href: '/portal/schedule',
      color: 'bg-orange-500',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-sunken dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-ink-muted mt-3">Loading your portal...</p>
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
              <h1 className="text-2xl font-bold text-ink dark:text-white">
                Welcome back, {profile?.full_name || user?.email?.split('@')[0] || 'Employee'}!
              </h1>
              <p className="text-ink-muted dark:text-ink-faint mt-1">
                Here's your employee portal overview
              </p>
            </div>
            <div className="flex items-center gap-3">
              {stats.unreadNotifications > 0 && (
                <Link to="/portal/notifications">
                  <Button variant="outline" size="sm">
                    <Bell className="w-4 h-4 mr-2" />
                    {stats.unreadNotifications} new
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-ink dark:text-white">{stats.leaveBalance}</p>
              <p className="text-xs text-ink-muted">Leave Days Left</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-ink dark:text-white">{stats.pendingTasks}</p>
              <p className="text-xs text-ink-muted">Pending Tasks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-ink dark:text-white">{stats.upcomingHolidays}</p>
              <p className="text-xs text-ink-muted">Upcoming Holidays</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Bell className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-ink dark:text-white">{stats.unreadNotifications}</p>
              <p className="text-xs text-ink-muted">Notifications</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Link key={action.href} to={action.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-sunken dark:bg-gray-800 hover:bg-surface-sunken dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <div className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center`}>
                      <action.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-ink-secondary dark:text-gray-300">{action.label}</span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Link to="/portal/activity" className="text-sm text-primary hover:text-primary">
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-ink-muted">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = activityIcons[activity.type];
                  const colorClass = activityColors[activity.type];
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink dark:text-white text-sm">{activity.title}</p>
                        <p className="text-xs text-ink-muted dark:text-ink-faint">{activity.description}</p>
                        <p className="text-xs text-ink-faint mt-1">
                          {new Date(activity.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface-sunken dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-ink dark:text-white">Team Meeting</p>
                    <p className="text-xs text-ink-muted">Tomorrow, 10:00 AM</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-faint" />
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-sunken dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-success" />
                  <div>
                    <p className="text-sm font-medium text-ink dark:text-white">Performance Review</p>
                    <p className="text-xs text-ink-muted">In 3 days</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-faint" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
