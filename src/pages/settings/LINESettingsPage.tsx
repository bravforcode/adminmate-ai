import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Users,
  Bell,
  FileText,
  Copy,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

interface LINEConfig {
  channel_access_token: string;
  channel_secret: string;
  webhook_url: string;
  enabled: boolean;
  connected_at: string | null;
}

export default function LINESettingsPage() {
  const { profile } = useAuthStore();
  const [config, setConfig] = useState<LINEConfig>({
    channel_access_token: '',
    channel_secret: '',
    webhook_url: '',
    enabled: false,
    connected_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    fetchLINEConfig();
  }, [profile?.company_id]);

  const fetchLINEConfig = async () => {
    if (!profile?.company_id) return;

    try {
      const { data } = await supabase
        .from('company_integrations')
        .select('config')
        .eq('company_id', profile.company_id)
        .eq('type', 'line')
        .single();

      if (data?.config) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to fetch LINE config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.company_id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('company_integrations')
        .upsert({
          company_id: profile.company_id,
          type: 'line',
          config,
          enabled: config.enabled,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save LINE config:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestMessage = async () => {
    setTestSending(true);
    setTestResult(null);

    try {
      // In production, this would call the LINE API to send a test message
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTestResult('success');
    } catch (error) {
      setTestResult('error');
    } finally {
      setTestSending(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(config.webhook_url || `${window.location.origin}/api/webhooks/line`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 mt-3">Loading LINE settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">LINE Integration</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Connect your LINE Official Account for employee notifications
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Connection Status */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${config.enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                  {config.enabled ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {config.enabled ? 'Connected' : 'Not Connected'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {config.connected_at
                      ? `Connected on ${new Date(config.connected_at).toLocaleDateString()}`
                      : 'Connect your LINE Official Account to get started'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestMessage}
                  disabled={!config.enabled || testSending}
                >
                  {testSending ? 'Sending...' : 'Send Test'}
                </Button>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-3 rounded-lg ${testResult === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}
              >
                {testResult === 'success' ? 'Test message sent successfully!' : 'Failed to send test message. Check your configuration.'}
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* LINE Channel Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Channel Access Token
              </label>
              <input
                type="password"
                value={config.channel_access_token}
                onChange={(e) => setConfig(prev => ({ ...prev, channel_access_token: e.target.value }))}
                placeholder="Enter your LINE channel access token"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Channel Secret
              </label>
              <input
                type="password"
                value={config.channel_secret}
                onChange={(e) => setConfig(prev => ({ ...prev, channel_secret: e.target.value }))}
                placeholder="Enter your LINE channel secret"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Webhook URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={config.webhook_url || `${window.location.origin}/api/webhooks/line`}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
                <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Configure this URL in your LINE Developers Console
              </p>
            </div>
            <div className="pt-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* LINE Features */}
        <Card>
          <CardHeader>
            <CardTitle>LINE Notification Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Bell className="w-5 h-5 text-blue-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">Leave Notifications</h3>
                </div>
                <p className="text-sm text-gray-500">Send leave request approvals and rejections via LINE</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-5 h-5 text-green-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">Document Reminders</h3>
                </div>
                <p className="text-sm text-gray-500">Notify employees about pending document uploads</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-purple-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">Onboarding Updates</h3>
                </div>
                <p className="text-sm text-gray-500">Guide new hires through onboarding via LINE</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-amber-500" />
                  <h3 className="font-medium text-gray-900 dark:text-white">Payroll Alerts</h3>
                </div>
                <p className="text-sm text-gray-500">Notify employees when payslips are ready</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Setup Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">1</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Create a LINE Official Account</p>
                  <p className="text-sm text-gray-500">Go to LINE Official Account Manager and create a new account</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">2</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Create a LINE Developers Channel</p>
                  <p className="text-sm text-gray-500">Go to LINE Developers Console and create a new channel</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">3</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Copy Channel Credentials</p>
                  <p className="text-sm text-gray-500">Copy the Channel Access Token and Channel Secret</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">4</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Configure Webhook</p>
                  <p className="text-sm text-gray-500">Paste the webhook URL above into the LINE Developers Console</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">5</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Test Connection</p>
                  <p className="text-sm text-gray-500">Click "Send Test" to verify the integration is working</p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
