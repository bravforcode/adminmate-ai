import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthGuard, CompanySetupGuard } from './AuthGuard'
import { AppLayout } from '../components/layout/AppLayout'
import { ErrorBoundary } from '../components/shared/ErrorBoundary'

const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('../pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('../pages/auth/ResetPasswordPage'))
const CompanySetupPage = lazy(() => import('../pages/onboarding/CompanySetupPage'))

// HR / Admin / Manager pages
const CandidatesPage = lazy(() => import('../pages/recruitment/CandidatesPage'))
const CandidateDetailPage = lazy(() => import('../pages/recruitment/CandidateDetailPage'))
const JobsPage = lazy(() => import('../pages/recruitment/JobsPage'))
const JobDetailPage = lazy(() => import('../pages/recruitment/JobDetailPage'))
const PipelinePage = lazy(() => import('../pages/recruitment/PipelinePage'))
const InterviewsPage = lazy(() => import('../pages/recruitment/InterviewsPage'))
const DocumentsPage = lazy(() => import('../pages/DocumentsPage'))
const OnboardingMgmtPage = lazy(() => import('../pages/OnboardingMgmtPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const ReportsPage = lazy(() => import('../pages/ReportsPage'))
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'))
const CompliancePage = lazy(() => import('../pages/settings/CompliancePage'))
const HiringPage = lazy(() => import('../pages/hiring/HiringPage'))
const HealthPage = lazy(() => import('../pages/HealthPage'))
const GeminiMonitoringPage = lazy(() => import('../pages/GeminiMonitoringPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

// Applicant pages
const MyProfilePage = lazy(() => import('../pages/applicant/MyProfilePage'))
const MyTasksPage = lazy(() => import('../pages/applicant/MyTasksPage'))

const HR_ROLES = ['admin', 'hr', 'manager']
const APPLICANT_ROLES = ['applicant']

function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Suspense fallback={<Loading />}><LoginPage /></Suspense>,
  },
  {
    path: '/register',
    element: <Suspense fallback={<Loading />}><RegisterPage /></Suspense>,
  },
  {
    path: '/forgot-password',
    element: <Suspense fallback={<Loading />}><ForgotPasswordPage /></Suspense>,
  },
  {
    path: '/reset-password',
    element: <Suspense fallback={<Loading />}><ResetPasswordPage /></Suspense>,
  },
  {
    path: '/setup-company',
    element: (
      <Suspense fallback={<Loading />}>
        <CompanySetupGuard>
          <CompanySetupPage />
        </CompanySetupGuard>
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <AuthGuard><ErrorBoundary><AppLayout /></ErrorBoundary></AuthGuard>,
    children: [
      // Default redirect based on role is handled in AuthGuard / LoginForm
      { index: true, element: <Navigate to="/dashboard" replace /> },

      // ── HR / Admin / Manager routes ──────────────────────────────
      {
        path: 'dashboard',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><DashboardPage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'recruitment/candidates',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><CandidatesPage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'recruitment/candidates/:id',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><CandidateDetailPage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'recruitment/jobs',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><JobsPage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'recruitment/jobs/:id',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><JobDetailPage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'recruitment/pipeline',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><PipelinePage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'recruitment/interviews',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><InterviewsPage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'documents',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><DocumentsPage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'hiring',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><HiringPage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'onboarding',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><OnboardingMgmtPage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'reports',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><ReportsPage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'health',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><HealthPage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'monitoring',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><GeminiMonitoringPage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'settings',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <Suspense fallback={<Loading />}><SettingsPage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'settings/compliance',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={['admin']}>
            <Suspense fallback={<Loading />}><CompliancePage /></Suspense>
          </AuthGuard>
        ),
      },

      // ── Shared (all roles) ────────────────────────────────────────

      // ── Applicant routes ──────────────────────────────────────────
      {
        path: 'my-profile',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={APPLICANT_ROLES}>
            <Suspense fallback={<Loading />}><MyProfilePage /></Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'my-tasks',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={APPLICANT_ROLES}>
            <Suspense fallback={<Loading />}><MyTasksPage /></Suspense>
          </AuthGuard>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Suspense fallback={<Loading />}><NotFoundPage /></Suspense>,
  },
])
