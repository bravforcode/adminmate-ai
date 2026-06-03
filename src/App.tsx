import React, { useState } from 'react';
import { Language, Page, UserRole, Job, Candidate, OnboardingDoc, OnboardingTask, AppSettings } from './types';
import { 
  initialJobs, 
  initialCandidates, 
  initialDocs, 
  initialTasks, 
  defaultSettings 
} from './mockData';

// Import modular layouts
import LoginView from './components/LoginView';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import JdGeneratorView from './components/JdGeneratorView';
import ResumeScreeningView from './components/ResumeScreeningView';
import PipelineView from './components/PipelineView';
import OnboardingManagerView from './components/OnboardingManagerView';
import OnboardingChecklistView from './components/OnboardingChecklistView';
import OnboardingAssistantView from './components/OnboardingAssistantView';
import CvBuilderView from './components/CvBuilderView';
import SettingsView from './components/SettingsView';

export default function App() {
  // Global States
  const [language, setLanguage] = useState<Language>('TH');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // App states
  const [userRole, setUserRole] = useState<UserRole>('Owner');
  const [activePage, setActivePage] = useState<Page>('dashboard');
  
  // Database mock layers
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [docs, setDocs] = useState<OnboardingDoc[]>(initialDocs);
  const [tasks, setTasks] = useState<OnboardingTask[]>(initialTasks);
  const [settings, setSettings] = useState<AppSettings>({
    ...defaultSettings,
    defaultLanguage: 'TH'
  });

  // Handle successful login
  const handleLoginSuccess = (email: string, role: UserRole) => {
    setIsLoggedIn(true);
    setUserRole(role);
    // If logging in as Applicant, direct to CV Builder and lock Applicant role
    if (role === 'Applicant') {
      setActivePage('cv-builder');
    } else {
      setActivePage('dashboard');
    }
  };

  // Add newly generated Job Description (SME Memory)
  const handleAddJob = (newJob: Job) => {
    setJobs(prev => [newJob, ...prev]);
  };

  // Upload/Screen new Candidate
  const handleUploadCandidate = (newCand: Candidate) => {
    setCandidates(prev => [newCand, ...prev]);
  };

  // Submit Candidate CV (Applicant sandbox view tool)
  const handleApplicantSubmit = (newCand: Candidate) => {
    setCandidates(prev => [newCand, ...prev]);
  };

  // Toggle/Update candidate pipeline status dropdowns
  const handleUpdateCandidateStatus = (id: string, status: Candidate['status']) => {
    setCandidates(prev => 
      prev.map(c => c.id === id ? { ...c, status } : c)
    );
  };

  // Update applicant recruiter logs (Notes modal)
  const handleUpdateCandidateNotes = (id: string, notes: string) => {
    setCandidates(prev => 
      prev.map(c => c.id === id ? { ...c, notes } : c)
    );
  };

  // Update statutory onboarding documents toggle (HR Vault)
  const handleUpdateDocStatus = (id: string, status: OnboardingDoc['status']) => {
    setDocs(prev => 
      prev.map(d => d.id === id ? { 
        ...d, 
        status,
        lastUpdated: `Updated on ${new Date().toISOString().split('T')[0]}`
      } : d)
    );
  };

  // Toggle employee todo task completion checkbox
  const handleToggleTask = (id: string) => {
    setTasks(prev => 
      prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  };

  // Save modified core settings company properties
  const handleUpdateSettings = (updated: AppSettings) => {
    setSettings(updated);
    setUserRole(updated.userRole);
  };

  // Perform logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setActivePage('dashboard');
  };

  // Derived dashboard stats counters
  const pendingDocsCount = docs.filter(d => d.status !== 'Completed').length;
  const onboardingInProgressCount = docs.filter(d => d.status === 'Completed').length > 0 ? 1 : 0;

  // Conditional login view render route
  if (!isLoggedIn) {
     return (
       <LoginView 
         language={language}
         setLanguage={setLanguage}
         onLoginSuccess={handleLoginSuccess}
       />
     );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white antialiased">
      
      {/* Dynamic Header Component */}
      <Header 
        language={language}
        setLanguage={setLanguage}
        activePage={activePage}
        setActivePage={setActivePage}
        userRole={userRole}
        setUserRole={setUserRole}
        companyName={settings.companyName}
        onLogout={handleLogout}
      />

      {/* Primary view viewport layout center */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        
        {activePage === 'dashboard' && (
          <DashboardView 
            language={language}
            jobs={jobs}
            candidates={candidates}
            pendingDocsCount={pendingDocsCount}
            onboardingInProgressCount={onboardingInProgressCount}
            setActivePage={setActivePage}
            setUserRole={setUserRole}
          />
        )}

        {activePage === 'jd-generator' && (
          <JdGeneratorView 
            language={language}
            onAddJob={handleAddJob}
          />
        )}

        {(activePage === 'resume-upload' || activePage === 'candidate-matching') && (
          <ResumeScreeningView 
            language={language}
            candidates={candidates}
            onUploadCandidate={handleUploadCandidate}
            onUpdateStatus={handleUpdateCandidateStatus}
          />
        )}

        {activePage === 'pipeline' && (
          <PipelineView 
            language={language}
            candidates={candidates}
            onUpdateStatus={handleUpdateCandidateStatus}
            onUpdateNotes={handleUpdateCandidateNotes}
          />
        )}

        {activePage === 'onboarding-manager' && (
          <OnboardingManagerView 
            language={language}
            docs={docs}
            onUpdateDocStatus={handleUpdateDocStatus}
          />
        )}

        {activePage === 'onboarding-checklist' && (
          <OnboardingChecklistView 
            language={language}
            tasks={tasks}
            onToggleTask={handleToggleTask}
          />
        )}

        {activePage === 'onboarding-assistant' && (
          <OnboardingAssistantView 
            language={language}
          />
        )}

        {activePage === 'cv-builder' && (
          <CvBuilderView 
            language={language}
            onApplicantSubmit={handleApplicantSubmit}
          />
        )}

        {activePage === 'settings' && (
          <SettingsView 
            language={language}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            setLanguage={setLanguage}
          />
        )}

      </main>

      {/* Universal Footer section */}
      <footer className="bg-white border-t border-slate-200/60 py-6 text-center select-none font-sans">
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} AdminMate AI • {language === 'TH' ? 'ระบบบริหารจัดการพนักงาน SME คู่ใจคุณ' : 'The Integrated SME Employee Onboarding Copilot'}
        </p>
      </footer>

    </div>
  );
}
