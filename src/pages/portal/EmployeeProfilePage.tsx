import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Save,
  CheckCircle2,
  Camera,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

interface EmployeeProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  location: string;
  position: string;
  department: string;
  hire_date: string;
  nationality: string;
  emergency_contact: string;
  emergency_phone: string;
  profile_photo_url: string;
}

export default function EmployeeProfilePage() {
  const { user } = useAuthStore();
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [user?.id]);

  const fetchProfile = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setEmployeeProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!employeeProfile?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          phone: employeeProfile.phone,
          location: employeeProfile.location,
          emergency_contact: employeeProfile.emergency_contact,
          emergency_phone: employeeProfile.emergency_phone,
        })
        .eq('id', employeeProfile.id);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-sunken dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-ink-muted mt-3">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-sunken dark:bg-gray-900">
      {/* Header */}
      <div className="bg-surface dark:bg-gray-800 border-b border-border dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-ink dark:text-white">My Profile</h1>
          <p className="text-ink-muted dark:text-ink-faint mt-1">
            Manage your personal information
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Profile Photo */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {employeeProfile?.profile_photo_url ? (
                    <img
                      src={employeeProfile.profile_photo_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-ink-faint" />
                  )}
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink dark:text-white">
                  {employeeProfile?.first_name} {employeeProfile?.last_name}
                </h2>
                <p className="text-ink-muted">{employeeProfile?.position}</p>
                <p className="text-sm text-ink-faint">{employeeProfile?.department}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={employeeProfile?.first_name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface-sunken dark:bg-gray-800 text-ink dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={employeeProfile?.last_name || ''}
                  disabled
                  className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface-sunken dark:bg-gray-800 text-ink dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <input
                  type="email"
                  value={employeeProfile?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface-sunken dark:bg-gray-800 text-ink dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={employeeProfile?.phone || ''}
                  onChange={(e) => setEmployeeProfile(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-800 text-ink dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location
                </label>
                <input
                  type="text"
                  value={employeeProfile?.location || ''}
                  onChange={(e) => setEmployeeProfile(prev => prev ? { ...prev, location: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-800 text-ink dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                  <Briefcase className="w-4 h-4 inline mr-1" />
                  Position
                </label>
                <input
                  type="text"
                  value={employeeProfile?.position || ''}
                  disabled
                  className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface-sunken dark:bg-gray-800 text-ink dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Hire Date
                </label>
                <input
                  type="text"
                  value={employeeProfile?.hire_date ? new Date(employeeProfile.hire_date).toLocaleDateString() : ''}
                  disabled
                  className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface-sunken dark:bg-gray-800 text-ink dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                  Nationality
                </label>
                <input
                  type="text"
                  value={employeeProfile?.nationality || ''}
                  disabled
                  className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface-sunken dark:bg-gray-800 text-ink dark:text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Emergency Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={employeeProfile?.emergency_contact || ''}
                  onChange={(e) => setEmployeeProfile(prev => prev ? { ...prev, emergency_contact: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-800 text-ink dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-secondary dark:text-gray-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={employeeProfile?.emergency_phone || ''}
                  onChange={(e) => setEmployeeProfile(prev => prev ? { ...prev, emergency_phone: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-border dark:border-gray-600 rounded-lg bg-surface dark:bg-gray-800 text-ink dark:text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={fetchProfile}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>Saving...</>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
