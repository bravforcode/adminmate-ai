import React, { useState } from 'react';
import { translations } from '../translations';
import { Language, AppSettings, UserRole } from '../types';
import { 
  Settings, 
  Building2, 
  Save, 
  BellRing, 
  UserSquare2, 
  CheckCircle2,
  Image,
  Globe
} from 'lucide-react';

interface SettingsViewProps {
  language: Language;
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  setLanguage: (lang: Language) => void;
}

export default function SettingsView({
  language,
  settings,
  onUpdateSettings,
  setLanguage
}: SettingsViewProps) {
  const t = translations[language];

  // Local Form state
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(settings.companyLogoUrl);
  const [defaultLanguage, setDefaultLanguage] = useState(settings.defaultLanguage);
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notificationsEnabled);
  const [userRole, setUserRole] = useState<UserRole>(settings.userRole);

  const [saving, setSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      onUpdateSettings({
        companyName,
        companyLogoUrl,
        defaultLanguage,
        notificationsEnabled,
        userRole
      });
      // Sync global translation scope
      setLanguage(defaultLanguage);
      alert(language === 'TH' ? 'บันทึกการตั้งค่าระบบเรียบร้อย!' : 'System settings successfully matching!');
    }, 600);
  };

  const logoPresets = [
    { name: 'Modern Tech Blue', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100&auto=format&fit=crop&q=80' },
    { name: 'Agile Purple SME', url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=100&auto=format&fit=crop&q=80' },
    { name: 'Creative Orange Agency', url: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=100&auto=format&fit=crop&q=80' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-slate-950 tracking-tight sm:text-3xl flex items-center gap-2">
          <Settings className="h-7 w-7 text-indigo-600" />
          {t.settings}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {language === 'TH'
            ? 'อนุรักษ์ข้อมูลหน่วยงาน ปรับแต่งค่าสวัสดิการผู้จัดการพนักงานใหม่ และสิทธิ์การใช้งานของแอดมินบริษัท'
            : 'Tailor corporate metadata details, toggle global alerts triggers and assign HR user roles scopes.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Settings Form Left Column */}
        <form onSubmit={handleSave} className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
          
          {/* Section 1: Business profile block */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="h-4.5 w-4.5 text-indigo-600" />
              {language === 'TH' ? 'ข้อมูลเกี่ยวกับผู้ประกอบการ' : 'SME Company Profile'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-205 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-[#6366f1]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide">Company Logo URL</label>
                <input
                  type="text"
                  value={companyLogoUrl}
                  onChange={(e) => setCompanyLogoUrl(e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-slate-205 bg-slate-50/50 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-[#6366f1]"
                />
              </div>
            </div>

            {/* Quick Logo presets */}
            <div>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1.5">Preset Theme Logo Watermarks</span>
              <div className="flex flex-wrap gap-2">
                {logoPresets.map((l, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCompanyLogoUrl(l.url)}
                    className="px-2.5 py-1 text-[10px] font-bold border border-slate-200 hover:border-indigo-400 bg-slate-50 text-slate-600 rounded-lg cursor-pointer transition-all"
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Localization defaults switcher */}
          <div className="space-y-4 pt-4 border-t border-slate-50">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Globe className="h-4.5 w-4.5 text-indigo-600" />
              {language === 'TH' ? 'ระบบภาษาทำงานหลัก' : 'Localization Defaults'}
            </h3>
            
            <div>
              <span className="block text-[10px] text-slate-500 font-semibold mb-2">Default Application Interface Language</span>
              <div className="flex gap-2 max-w-xs">
                <button
                  type="button"
                  onClick={() => setDefaultLanguage('TH')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    defaultLanguage === 'TH'
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  ภาษาไทย
                </button>
                <button
                  type="button"
                  onClick={() => setDefaultLanguage('EN')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    defaultLanguage === 'EN'
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Notification settings checklists */}
          <div className="space-y-4 pt-4 border-t border-slate-50">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <BellRing className="h-4.5 w-4.5 text-indigo-600" />
              {language === 'TH' ? 'ระบบการตั้งค่าสภาวะแจ้งเตือนพนักงานใหม่' : 'Notification Triggers Alerts'}
            </h3>

            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  className="h-4.5 w-4.5 rounded text-indigo-600 border-slate-250 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {language === 'TH' ? 'ส่งอีเมลอัตโนมัติแจ้งเตือนเมื่อผู้สมัครยื่นเอกสารไม่ครบถ้วน' : 'Enable automated reminder emails regarding missing onboarding files'}
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4.5 w-4.5 rounded text-indigo-600 border-slate-250 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">
                  {language === 'TH' ? 'แจ้งเตือนเมื่อมีผู้สมัครงานรายใหม่กด Submit ประวัติเข้าบอร์ด' : 'Alert SME dashboard when new applicants submit CV drafts'}
                </span>
              </label>
            </div>
          </div>

          {/* Section 4: Role select */}
          <div className="space-y-4 pt-4 border-t border-slate-50">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <UserSquare2 className="h-4.5 w-4.5 text-indigo-600" />
              {language === 'TH' ? 'สิทธิ์การเข้าถึงข้อมูลประจำบุคคล' : 'User Permission Levels'}
            </h3>

            <div className="max-w-xs">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide">Current Role Mode</label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as UserRole)}
                className="mt-1 block w-full rounded-xl border border-slate-205 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Owner">Owner / CEO</option>
                <option value="HR">HR Manager</option>
                <option value="Admin">Administrator</option>
                <option value="Applicant">Applicant (Preview Only)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm cursor-pointer transition-colors"
          >
            <Save className="h-4 w-4" />
            {saving ? (language === 'TH' ? 'กำลังบันทึกค่า...' : 'Saving metrics...') : t.save}
          </button>

        </form>

        {/* Right Preview Card Info Column */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/50 space-y-4 h-fit">
          <div className="space-y-1">
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-extrabold font-sans uppercase">
              Live Company Preview
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-2">{companyName}</h3>
            <p className="text-xs text-slate-500 font-medium font-sans">Active SME Platform Workspace</p>
          </div>

          <div className="border-t border-slate-200 pt-4 flex flex-col items-center">
            {companyLogoUrl ? (
              <img 
                src={companyLogoUrl} 
                alt="Uploaded Logo" 
                className="h-20 w-20 rounded-xl object-cover border border-slate-100 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                <Image className="h-8 w-8" />
              </div>
            )}
            <span className="text-[10px] text-slate-400 font-bold mt-2 font-mono">LOGO WATERMARK PREVIEW</span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-150 text-[10.5px] text-slate-600 leading-normal font-medium flex items-start gap-2 pt-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <span>
              {language === 'TH'
                ? 'การปรับตารางภาษาเริ่มต้น จะมีผลกับการแสดงผลคำในระบบ แฟ้มคลังข้อมูล และระบบ AI ช่วยคุยทั้งหมดทันทีเมื่อส่งบันทึกตกลง'
                : 'Saving settings instantly adapts the greeting headers and structural data pools throughout AdminMate AI.'}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
