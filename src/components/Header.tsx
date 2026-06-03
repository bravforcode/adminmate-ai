import { translations } from '../translations';
import { Language, Page, UserRole } from '../types';
import { 
  Building2, 
  User, 
  Menu, 
  X, 
  LogOut, 
  LayoutDashboard, 
  FileText, 
  Search, 
  GitMerge, 
  Network, 
  FolderLock, 
  CheckSquare, 
  MessageSquare, 
  UserSquare2, 
  Settings, 
  Sparkles,
  Globe
} from 'lucide-react';
import React, { useState } from 'react';

interface HeaderProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  activePage: Page;
  setActivePage: (page: Page) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  companyName: string;
  onLogout: () => void;
}

export default function Header({
  language,
  setLanguage,
  activePage,
  setActivePage,
  userRole,
  setUserRole,
  companyName,
  onLogout
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = translations[language];

  // Group pages based on perspective
  const hrTabs = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'jd-generator', label: t.jdGenerator, icon: FileText },
    { id: 'resume-upload', label: t.resumeUpload, icon: Search },
    { id: 'candidate-matching', label: t.candidateMatching, icon: GitMerge },
    { id: 'pipeline', label: t.candidatePipeline, icon: Network },
    { id: 'onboarding-manager', label: t.onboardingManager, icon: FolderLock },
    { id: 'settings', label: t.settings, icon: Settings },
  ] as const;

  const applicantTabs = [
    { id: 'cv-builder', label: t.cvBuilder, icon: UserSquare2 },
    { id: 'onboarding-checklist', label: t.onboardingChecklist, icon: CheckSquare },
    { id: 'onboarding-assistant', label: t.onboardingAssistant, icon: MessageSquare },
  ] as const;

  const handlePageClick = (pageId: Page) => {
    setActivePage(pageId);
    setMobileMenuOpen(false);
  };

  const currentTabs = userRole === 'Applicant' ? applicantTabs : hrTabs;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo Brand section */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-100">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-slate-900 text-lg leading-tight tracking-tight">
                  AdminMate <span className="text-indigo-600 font-bold text-xs bg-indigo-50 px-1.5 py-0.5 rounded-md ml-1 inline-block align-middle">AI</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[150px] sm:max-w-xs">
                  {userRole === 'Applicant' ? t.navApplicantSuite : companyName}
                </span>
              </div>
            </div>
          </div>

          {/* Perspective/Role Selection Trigger in Center (Responsive) */}
          <div className="hidden md:flex items-center mx-4 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => {
                setUserRole('HR');
                setActivePage('dashboard');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                userRole !== 'Applicant'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              {t.navSmeSuite}
            </button>
            <button
              onClick={() => {
                setUserRole('Applicant');
                setActivePage('cv-builder');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                userRole === 'Applicant'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              {t.navApplicantSuite}
            </button>
          </div>

          {/* Right action controls */}
          <div className="hidden lg:flex items-center gap-4">
            
            {/* TH/EN Switcher */}
            <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setLanguage('TH')}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                  language === 'TH' ? 'bg-white text-indigo-700 font-extrabold shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                TH
              </button>
              <button
                onClick={() => setLanguage('EN')}
                className={`px-2 py-1 rounded text-[11px] font-bold transition-all ${
                  language === 'EN' ? 'bg-white text-indigo-700 font-extrabold shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                EN
              </button>
            </div>

            {/* Logged in avatar info */}
            <div className="h-8 w-px bg-slate-200"></div>

            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shadow-2xs">
                {userRole === 'Applicant' ? 'AP' : 'HR'}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800">
                  {userRole === 'Applicant' ? 'Job Candidate' : 'SME Manager'}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">{userRole}</p>
              </div>
              <button
                onClick={onLogout}
                className="ml-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title={t.signOut}
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Quick toggle bar tools for medium or small screens */}
          <div className="flex items-center lg:hidden gap-2">
            {/* Mobile language switch icon style */}
            <button
              onClick={() => setLanguage(language === 'TH' ? 'EN' : 'TH')}
              className="flex items-center gap-1 p-2 text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold"
              title="Toggle Language"
            >
              <Globe className="h-3.5 w-3.5 text-slate-500" />
              <span>{language}</span>
            </button>

            {/* Mobile menu icon button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-50 border border-slate-200"
            >
              {mobileMenuOpen ? <X className="h-5.5 w-5.5" /> : <Menu className="h-5.5 w-5.5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Primary horizontal tab strip on Desktop */}
      <div className="hidden lg:block bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-8 flex gap-1">
          {currentTabs.map((tab) => {
            const Icon = tab.icon;
            const isSel = activePage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handlePageClick(tab.id as Page)}
                className={`py-3 px-4 font-semibold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                  isSel
                    ? 'border-indigo-600 text-indigo-600 bg-white/50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                }`}
              >
                <Icon className={`h-4 w-4 ${isSel ? 'text-indigo-600' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Collapsible Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute left-0 right-0 top-16 bg-white shadow-xl border-b border-slate-200 animate-in fade-in-50 duration-200">
          <div className="px-3 pt-3 pb-3 space-y-1">
            
            {/* Context/Role switcher for smaller widths */}
            <div className="bg-slate-100 p-1.5 rounded-xl border border-slate-150 grid grid-cols-2 mb-3">
              <button
                onClick={() => {
                  setUserRole('HR');
                  handlePageClick('dashboard');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-lg text-xs font-bold transition-all ${
                  userRole !== 'Applicant'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                <Building2 className="h-4 w-4" />
                {t.navSmeSuite}
              </button>
              <button
                onClick={() => {
                  setUserRole('Applicant');
                  handlePageClick('cv-builder');
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-lg text-xs font-bold transition-all ${
                  userRole === 'Applicant'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                <User className="h-4 w-4" />
                {t.navApplicantSuite}
              </button>
            </div>

            {/* List navigation tabs dynamically */}
            <p className="text-[10px] font-bold text-slate-400 uppercase px-3 pb-1">
              {userRole === 'Applicant' ? t.navApplicantSuite : t.navSmeSuite}
            </p>

            {currentTabs.map((tab) => {
              const Icon = tab.icon;
              const isSel = activePage === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handlePageClick(tab.id as Page)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isSel
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isSel ? 'text-indigo-600' : 'text-slate-400'}`} />
                  {tab.label}
                </button>
              );
            })}

            <div className="h-px bg-slate-100 my-2"></div>

            {/* Session logout */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4.5 w-4.5 text-red-500" />
              {t.signOut}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
