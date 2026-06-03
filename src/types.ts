export type Language = 'TH' | 'EN';

export type UserRole = 'Owner' | 'HR' | 'Admin' | 'Applicant';

export interface User {
  email: string;
  role: UserRole;
  companyName: string;
}

export type Page =
  | 'dashboard'
  | 'jd-generator'
  | 'resume-upload'
  | 'candidate-matching'
  | 'pipeline'
  | 'onboarding-manager'
  | 'onboarding-checklist'
  | 'onboarding-assistant'
  | 'cv-builder'
  | 'settings';

export interface Job {
  id: string;
  title: string;
  department: string;
  experienceLevel: string;
  salaryRange: string;
  jobType: string;
  responsibilities: string[];
  skills: string[];
  createdAt: string;
  language: Language;
}

export interface Candidate {
  id: string;
  name: string;
  positionApplied: string;
  skills: string[];
  experience: string; // e.g. "2 years"
  education: string;
  aiSummary: string;
  matchScore: number;
  status: 'New' | 'Shortlisted' | 'Interview' | 'Offered' | 'Rejected';
  notes?: string;
  email?: string;
  phone?: string;
}

export interface CompareMatch {
  jobTitle: string;
  candidateName: string;
  matchScore: number;
  skillMatch: { name: string; matched: boolean }[];
  experienceMatch: string;
  missingSkills: string[];
  suggestedQuestions: string[];
}

export interface OnboardingDoc {
  id: string;
  nameEn: string;
  nameTh: string;
  status: 'Completed' | 'Pending' | 'Missing';
  lastUpdated?: string;
}

export interface OnboardingTask {
  id: string;
  taskEn: string;
  taskTh: string;
  timeframe: 'Day 1' | 'Week 1';
  completed: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  textTh?: string;
  timestamp: Date;
}

export interface CV {
  fullName: string;
  email: string;
  phone: string;
  targetPosition: string;
  summary: string;
  workExperience: {
    company: string;
    role: string;
    duration: string;
    details: string;
  }[];
  education: {
    school: string;
    degree: string;
    year: string;
  }[];
  skills: string[];
  portfolioLink: string;
  language: Language;
}

export interface AppSettings {
  companyName: string;
  companyLogoUrl: string;
  defaultLanguage: Language;
  notificationsEnabled: boolean;
  userRole: UserRole;
}
