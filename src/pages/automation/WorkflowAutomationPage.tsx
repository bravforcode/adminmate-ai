import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Play,
  Plus,
  Clock,
  Users,
  FileText,
  Bell,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: WorkflowAction[];
  enabled: boolean;
  last_run: string | null;
  run_count: number;
  status: 'active' | 'paused' | 'error';
}

interface WorkflowAction {
  type: 'email' | 'notification' | 'task' | 'document' | 'approval';
  label: string;
  config: Record<string, any>;
}

const WORKFLOW_TEMPLATES = [
  {
    id: 'new-hire-onboarding',
    name: 'New Hire Onboarding',
    description: 'Automatically create onboarding tasks when a candidate is hired',
    trigger: 'Candidate status changed to "Hired"',
    icon: Users,
    color: 'bg-blue-500',
  },
  {
    id: 'leave-approval',
    name: 'Leave Request Approval',
    description: 'Notify managers and track leave requests',
    trigger: 'Leave request submitted',
    icon: Clock,
    color: 'bg-success',
  },
  {
    id: 'document-reminder',
    name: 'Document Expiry Reminder',
    description: 'Send reminders before document expiry dates',
    trigger: '30 days before document expiry',
    icon: FileText,
    color: 'bg-amber-500',
  },
  {
    id: 'probation-review',
    name: 'Probation Review',
    description: 'Schedule probation review meetings automatically',
    trigger: '90 days after hire date',
    icon: Bell,
    color: 'bg-purple-500',
  },
];

export default function WorkflowAutomationPage() {
  const { profile } = useAuthStore();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    fetchWorkflows();
  }, [profile?.company_id]);

  const fetchWorkflows = async () => {
    if (!profile?.company_id) return;

    try {
      const { data } = await supabase
        .from('workflows')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      // Mock workflows if none exist
      if (!data || data.length === 0) {
        setWorkflows([
          {
            id: '1',
            name: 'New Hire Onboarding',
            description: 'Automatically create onboarding tasks when a candidate is hired',
            trigger: 'Candidate status changed to "Hired"',
            actions: [
              { type: 'task', label: 'Create onboarding checklist', config: {} },
              { type: 'email', label: 'Send welcome email', config: {} },
              { type: 'notification', label: 'Notify HR team', config: {} },
            ],
            enabled: true,
            last_run: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            run_count: 12,
            status: 'active',
          },
          {
            id: '2',
            name: 'Leave Request Flow',
            description: 'Route leave requests to managers for approval',
            trigger: 'Leave request submitted',
            actions: [
              { type: 'notification', label: 'Notify manager', config: {} },
              { type: 'approval', label: 'Manager approval', config: {} },
              { type: 'email', label: 'Confirm to employee', config: {} },
            ],
            enabled: true,
            last_run: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            run_count: 28,
            status: 'active',
          },
          {
            id: '3',
            name: 'Document Expiry Alert',
            description: 'Send reminders before documents expire',
            trigger: '30 days before document expiry',
            actions: [
              { type: 'notification', label: 'Notify employee', config: {} },
              { type: 'email', label: 'Send reminder email', config: {} },
            ],
            enabled: true,
            last_run: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            run_count: 45,
            status: 'active',
          },
        ]);
      } else {
        setWorkflows(data);
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkflow = async (id: string) => {
    setWorkflows(prev =>
      prev.map(w =>
        w.id === id ? { ...w, enabled: !w.enabled, status: w.enabled ? 'paused' : 'active' } : w
      )
    );
  };

  const deleteWorkflow = async (id: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== id));
  };

  const statusColors = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    paused: 'bg-surface-sunken text-ink-secondary dark:bg-gray-800 dark:text-gray-300',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  const actionIcons = {
    email: FileText,
    notification: Bell,
    task: CheckCircle2,
    document: FileText,
    approval: Users,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-sunken dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-ink-muted mt-3">Loading workflows...</p>
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
              <h1 className="text-2xl font-bold text-ink dark:text-white flex items-center gap-2">
                <Zap className="w-6 h-6 text-amber-500" />
                Workflow Automation
              </h1>
              <p className="text-ink-muted dark:text-ink-faint mt-1">
                Automate repetitive HR tasks and approvals
              </p>
            </div>
            <Button onClick={() => setShowTemplates(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Workflow
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-ink dark:text-white">{workflows.length}</p>
              <p className="text-xs text-ink-muted">Total Workflows</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Play className="w-8 h-8 text-success mx-auto mb-2" />
              <p className="text-2xl font-bold text-ink dark:text-white">
                {workflows.filter(w => w.enabled).length}
              </p>
              <p className="text-xs text-ink-muted">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-ink dark:text-white">
                {workflows.reduce((a, w) => a + w.run_count, 0)}
              </p>
              <p className="text-xs text-ink-muted">Total Runs</p>
            </CardContent>
          </Card>
        </div>

        {/* Workflow List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Workflows</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {workflows.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-ink-muted">No workflows yet</p>
                <Button className="mt-4" onClick={() => setShowTemplates(true)}>
                  Create Your First Workflow
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {workflows.map((workflow) => (
                  <motion.div
                    key={workflow.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 hover:bg-surface-sunken dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${workflow.enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-surface-sunken dark:bg-gray-800'}`}>
                          <Zap className={`w-5 h-5 ${workflow.enabled ? 'text-success' : 'text-ink-faint'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-ink dark:text-white">{workflow.name}</p>
                          <p className="text-sm text-ink-muted">{workflow.description}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-ink-faint">
                              Trigger: {workflow.trigger}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[workflow.status]}`}>
                              {workflow.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-sm">
                          <p className="text-ink-muted">{workflow.run_count} runs</p>
                          {workflow.last_run && (
                            <p className="text-xs text-ink-faint">
                              Last: {new Date(workflow.last_run).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={workflow.enabled}
                            onChange={() => toggleWorkflow(workflow.id)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                        <button
                          onClick={() => deleteWorkflow(workflow.id)}
                          className="p-2 text-ink-faint hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Actions Preview */}
                    <div className="mt-3 flex flex-wrap gap-2 ml-14">
                      {workflow.actions.map((action, i) => {
                        const Icon = actionIcons[action.type];
                        return (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-surface-sunken dark:bg-gray-800 rounded text-xs text-ink-muted dark:text-ink-faint"
                          >
                            <Icon className="w-3 h-3" />
                            {action.label}
                          </span>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
          >
            <div className="p-6 border-b border-border dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-ink dark:text-white">Workflow Templates</h2>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-ink-faint hover:text-ink-muted"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              {WORKFLOW_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="p-4 border border-border dark:border-gray-700 rounded-lg hover:bg-surface-sunken dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 ${template.color} rounded-lg flex items-center justify-center`}>
                      <template.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-ink dark:text-white">{template.name}</h3>
                      <p className="text-sm text-ink-muted mt-1">{template.description}</p>
                      <p className="text-xs text-ink-faint mt-2">Trigger: {template.trigger}</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Use Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
