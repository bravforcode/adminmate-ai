import { useState, useEffect } from 'react'

interface TourStep {
  target: string
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

interface TourConfig {
  id: string
  steps: TourStep[]
}

// Predefined tours for all major pages
const TOURS: Record<string, TourConfig> = {
  dashboard: {
    id: 'dashboard',
    steps: [
      { target: '.dashboard-greeting', title: 'Welcome!', content: 'This is your AdminMate dashboard. Get a quick overview of your company at a glance.', placement: 'bottom' },
      { target: '.stat-cards', title: 'Key Metrics', content: 'Track employees, open positions, active candidates, and interviews in real-time.', placement: 'bottom' },
      { target: '.recent-activity', title: 'Recent Activity', content: 'See latest actions across your company — new hires, applications, and messages.', placement: 'top' },
      { target: '.ai-chat-button', title: 'Mate AI', content: 'Ask Mate AI anything about HR, company policies, or get help with tasks.', placement: 'left' },
    ],
  },
  jobs: {
    id: 'jobs',
    steps: [
      { target: '.jobs-header', title: 'Jobs Overview', content: 'Manage all open positions here. View, edit, or close job postings.', placement: 'bottom' },
      { target: '.add-job-button', title: 'Post a Job', content: 'Click here to create a new job posting. Use AI to generate the description!', placement: 'left' },
      { target: '.job-list', title: 'Job List', content: 'Browse all jobs. Click any job to view details, candidates, and pipeline.', placement: 'top' },
    ],
  },
  candidates: {
    id: 'candidates',
    steps: [
      { target: '.candidates-header', title: 'Candidates', content: 'All candidates in one place. Search, filter, and sort by skills or status.', placement: 'bottom' },
      { target: '.add-candidate-button', title: 'Add Candidate', content: 'Add a new candidate manually or bulk import from CSV.', placement: 'left' },
      { target: '.candidate-table', title: 'Candidate List', content: 'Click any candidate to view full profile, resume, and application status.', placement: 'top' },
    ],
  },
  pipeline: {
    id: 'pipeline',
    steps: [
      { target: '.pipeline-header', title: 'Hiring Pipeline', content: 'Drag and drop candidates through your hiring stages. Real-time updates for your team.', placement: 'bottom' },
      { target: '.pipeline-column', title: 'Pipeline Stages', content: 'Each column represents a hiring stage. Drag candidates to move them forward.', placement: 'right' },
      { target: '.pipeline-card', title: 'Candidate Cards', content: 'Click a card to view details, schedule interviews, or send offers.', placement: 'bottom' },
    ],
  },
  interviews: {
    id: 'interviews',
    steps: [
      { target: '.interviews-header', title: 'Interviews', content: 'Schedule and manage all interviews here.', placement: 'bottom' },
      { target: '.schedule-interview', title: 'Schedule', content: 'Click to schedule a new interview. Pick date, time, and interviewers.', placement: 'left' },
    ],
  },
  offers: {
    id: 'offers',
    steps: [
      { target: '.offers-header', title: 'Offers', content: 'Create and manage offer letters. Generate with AI in one click.', placement: 'bottom' },
      { target: '.generate-offer', title: 'AI Offer Generation', content: 'Let Mate AI draft a professional offer letter based on the candidate and job details.', placement: 'bottom' },
    ],
  },
  documents: {
    id: 'documents',
    steps: [
      { target: '.documents-header', title: 'Documents', content: 'Manage all company documents — onboarding forms, contracts, agreements.', placement: 'bottom' },
      { target: '.upload-document', title: 'Upload', content: 'Upload new documents. Supports PDF, DOCX, and images.', placement: 'left' },
      { target: '.sign-document', title: 'E-Signature', content: 'Send documents for electronic signature. Track signing status.', placement: 'top' },
    ],
  },
  onboarding: {
    id: 'onboarding',
    steps: [
      { target: '.onboarding-header', title: 'Onboarding', content: 'Manage new hire onboarding checklists and tasks.', placement: 'bottom' },
      { target: '.onboarding-progress', title: 'Progress', content: 'Track each new hire\'s onboarding progress in real-time.', placement: 'top' },
    ],
  },
  reports: {
    id: 'reports',
    steps: [
      { target: '.reports-header', title: 'Reports', content: 'Generate HR reports — hiring funnel, diversity, compensation, and more.', placement: 'bottom' },
      { target: '.report-charts', title: 'Charts', content: 'Visual data helps you make better decisions. Export as PDF or CSV.', placement: 'top' },
    ],
  },
  settings: {
    id: 'settings',
    steps: [
      { target: '.settings-nav', title: 'Settings', content: 'Configure company profile, billing, security, and integrations.', placement: 'right' },
      { target: '.billing-section', title: 'Billing', content: 'Manage your subscription plan and payment methods.', placement: 'bottom' },
    ],
  },
  leave: {
    id: 'leave',
    steps: [
      { target: '.leave-header', title: 'Leave Management', content: 'Request leave, view balances, and approve team requests.', placement: 'bottom' },
      { target: '.leave-balance', title: 'Your Balance', content: 'See your remaining leave days for each type.', placement: 'top' },
    ],
  },
  attendance: {
    id: 'attendance',
    steps: [
      { target: '.attendance-header', title: 'Attendance', content: 'Track clock-in/out times, late arrivals, and overtime.', placement: 'bottom' },
    ],
  },
  payroll: {
    id: 'payroll',
    steps: [
      { target: '.payroll-header', title: 'Payroll', content: 'Process payroll, view payslips, and manage tax filings for Thailand.', placement: 'bottom' },
    ],
  },
  performance: {
    id: 'performance',
    steps: [
      { target: '.performance-header', title: 'Performance', content: 'Set goals, conduct reviews, and track employee growth.', placement: 'bottom' },
    ],
  },
  learning: {
    id: 'learning',
    steps: [
      { target: '.learning-header', title: 'Learning', content: 'Browse courses, enroll employees, and track training progress.', placement: 'bottom' },
    ],
  },
}

interface TourState {
  active: boolean
  currentStep: number
  tourId: string
}

let tourListeners: Array<(state: TourState) => void> = []
let currentTour: TourState = { active: false, currentStep: 0, tourId: '' }

function emitTour() {
  tourListeners.forEach(l => l({ ...currentTour }))
}

export function startTour(tourId: string) {
  const tour = TOURS[tourId]
  if (!tour) return
  currentTour = { active: true, currentStep: 0, tourId }
  emitTour()
}

export function nextStep() {
  const tour = TOURS[currentTour.tourId]
  if (!tour) return
  if (currentTour.currentStep < tour.steps.length - 1) {
    currentTour.currentStep++
  } else {
    currentTour.active = false
  }
  emitTour()
}

export function prevStep() {
  if (currentTour.currentStep > 0) {
    currentTour.currentStep--
  }
  emitTour()
}

export function closeTour() {
  currentTour.active = false
  emitTour()
}

export function useTour() {
  const [state, setState] = useState<TourState>(currentTour)

  useEffect(() => {
    tourListeners.push(setState)
    return () => { tourListeners = tourListeners.filter(l => l !== setState) }
  }, [])

  const currentTourConfig = state.tourId ? TOURS[state.tourId] : null
  const step = currentTourConfig?.steps[state.currentStep]

  return {
    active: state.active,
    step,
    currentStep: state.currentStep,
    totalSteps: currentTourConfig?.steps.length || 0,
    tourId: state.tourId,
    next: nextStep,
    prev: prevStep,
    close: closeTour,
    start: startTour,
  }
}

export { TOURS }
