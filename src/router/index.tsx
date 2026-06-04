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
const CandidatesPage = lazy(() => import('../pages/recruitment/CandidatesPage'))
const CandidateDetailPage = lazy(() => import('../pages/recruitment/CandidateDetailPage'))
const JobsPage = lazy(() => import('../pages/recruitment/JobsPage'))
const JobDetailPage = lazy(() => import('../pages/recruitment/JobDetailPage'))
const PipelinePage = lazy(() => import('../pages/recruitment/PipelinePage'))
const InterviewsPage = lazy(() => import('../pages/recruitment/InterviewsPage'))
const DocumentsPage = lazy(() => import('../pages/DocumentsPage'))
const ChatPage = lazy(() => import('../pages/ChatPage'))
const OnboardingMgmtPage = lazy(() => import('../pages/OnboardingMgmtPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const ReportsPage = lazy(() => import('../pages/ReportsPage'))
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'))
const CompliancePage = lazy(() => import('../pages/settings/CompliancePage'))
const HiringPage = lazy(() => import('../pages/hiring/HiringPage'))
const HealthPage = lazy(() => import('../pages/HealthPage'))
const GeminiMonitoringPage = lazy(() => import('../pages/GeminiMonitoringPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

function Loading() {
  return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
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
    element: <Suspense fallback={<Loading />}>
      <CompanySetupGuard>
        <CompanySetupPage />
      </CompanySetupGuard>
    </Suspense>,
  },
  {
    path: '/',
    element: <AuthGuard><ErrorBoundary><AppLayout /></ErrorBoundary></AuthGuard>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: 'dashboard',
        element: <Suspense fallback={<Loading />}><DashboardPage /></Suspense>,
      },
      {
        path: 'recruitment/candidates',
        element: <Suspense fallback={<Loading />}><CandidatesPage /></Suspense>,
      },
      {
        path: 'recruitment/candidates/:id',
        element: <Suspense fallback={<Loading />}><CandidateDetailPage /></Suspense>,
      },
      {
        path: 'recruitment/jobs',
        element: <Suspense fallback={<Loading />}><JobsPage /></Suspense>,
      },
      {
        path: 'recruitment/jobs/:id',
        element: <Suspense fallback={<Loading />}><JobDetailPage /></Suspense>,
      },
      {
        path: 'recruitment/pipeline',
        element: <Suspense fallback={<Loading />}><PipelinePage /></Suspense>,
      },
      {
        path: 'recruitment/interviews',
        element: <Suspense fallback={<Loading />}><InterviewsPage /></Suspense>,
      },
      {
        path: 'documents',
        element: <Suspense fallback={<Loading />}><DocumentsPage /></Suspense>,
      },
      {
        path: 'chat',
        element: <Suspense fallback={<Loading />}><ChatPage /></Suspense>,
      },
      {
        path: 'hiring',
        element: <Suspense fallback={<Loading />}><HiringPage /></Suspense>,
      },
      {
        path: 'onboarding',
        element: <Suspense fallback={<Loading />}><OnboardingMgmtPage /></Suspense>,
      },
      {
        path: 'reports',
        element: <Suspense fallback={<Loading />}><ReportsPage /></Suspense>,
      },
      {
        path: 'health',
        element: <Suspense fallback={<Loading />}><HealthPage /></Suspense>,
      },
      {
        path: 'monitoring',
        element: <Suspense fallback={<Loading />}><GeminiMonitoringPage /></Suspense>,
      },
      {
        path: 'settings',
        element: <Suspense fallback={<Loading />}><SettingsPage /></Suspense>,
      },
      {
        path: 'settings/compliance',
        element: <Suspense fallback={<Loading />}><CompliancePage /></Suspense>,
      },
    ],
  },
  {
    path: '*',
    element: <Suspense fallback={<Loading />}><NotFoundPage /></Suspense>,
  },
])
