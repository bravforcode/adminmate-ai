import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { AuthGuard, CompanySetupGuard, getDefaultRoute } from './AuthGuard'
import { FeatureGate } from '../components/common/FeatureGate'
import { AppLayout } from '../components/layout/AppLayout'
import { ErrorBoundary } from '../components/common/ErrorBoundary'
import { AnimatedPage } from '../components/shared/AnimatedPage'
import { useAuthStore } from '../stores/authStore'

// ── Per-route error boundary + suspense wrapper ────────────────
function RouteWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary fallback={<div>Something went wrong. Please refresh.</div>}>
      <Suspense fallback={<div>Loading...</div>}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

const LandingPage = lazy(() => import('../pages/public/LandingPage'))
const PricingPage = lazy(() => import('../pages/public/PricingPage'))
const TermsPage = lazy(() => import('../pages/public/TermsPage'))
const PrivacyPage = lazy(() => import('../pages/public/PrivacyPage'))
const CookiesPage = lazy(() => import('../pages/public/CookiesPage'))
const LoginPage = lazy(() => import('../pages/auth/LoginPage'))
const OAuthCallbackPage = lazy(() => import('../pages/auth/OAuthCallbackPage'))
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
const DocumentSigningPage = lazy(() => import('../pages/documents/DocumentSigningPage'))
const OnboardingMgmtPage = lazy(() => import('../pages/OnboardingMgmtPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const ReportsPage = lazy(() => import('../pages/ReportsPage'))
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'))
const SecurityPage = lazy(() => import('../pages/settings/SecurityPage'))
const CompliancePage = lazy(() => import('../pages/settings/CompliancePage'))
const AuditLogPage = lazy(() => import('../pages/settings/AuditLogPage'))
const NotificationPreferencesPage = lazy(() => import('../pages/settings/NotificationPreferencesPage'))
const BulkImportPage = lazy(() => import('../pages/settings/BulkImportPage'))
const ImportPage = lazy(() => import('../pages/settings/ImportPage'))
const ExportPage = lazy(() => import('../pages/settings/ExportPage'))
const BillingPage = lazy(() => import('../pages/settings/BillingPage'))
const PDPAPage = lazy(() => import('../pages/settings/PDPAPage'))
const ThailandPayrollPage = lazy(() => import('../pages/settings/ThailandPayrollPage'))
const HiringPage = lazy(() => import('../pages/hiring/HiringPage'))
const PerformancePage = lazy(() => import('../pages/PerformancePage'))
const OKRPage = lazy(() => import('../pages/OKRPage'))
const HealthPage = lazy(() => import('../pages/HealthPage'))
const GeminiMonitoringPage = lazy(() => import('../pages/GeminiMonitoringPage'))
const BenefitsPage = lazy(() => import('../pages/BenefitsPage'))
const LearningPage = lazy(() => import('../pages/LearningPage'))
const EngagementPage = lazy(() => import('../pages/EngagementPage'))
const AttendancePage = lazy(() => import('../pages/AttendancePage'))
const LeavePage = lazy(() => import('../pages/LeavePage'))
const PeopleAnalyticsPage = lazy(() => import('../pages/PeopleAnalyticsPage'))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'))

// Messaging pages
const MessagesPage = lazy(() => import('../pages/messages/MessagesPage'))
const NotificationCenterPage = lazy(() => import('../pages/messages/NotificationCenter'))
const EmployeeListPage = lazy(() => import('../pages/employees/EmployeeListPage'))
const EmployeeDetailPage = lazy(() => import('../pages/employees/EmployeeDetailPage'))
const ApplyPage = lazy(() => import('../pages/portal/ApplyPage'))
const TrackApplicationPage = lazy(() => import('../pages/portal/TrackApplicationPage'))

// Payroll pages
const PayrollDashboardPage = lazy(() => import('../pages/payroll/PayrollDashboardPage'))
const PayrollRunPage = lazy(() => import('../pages/payroll/PayrollRunPage'))
const PayslipPage = lazy(() => import('../pages/payroll/PayslipPage'))

const HR_ROLES = ['admin', 'hr', 'manager']

function PublicRoot() {
  const profile = useAuthStore(s => s.profile)
  if (profile) {
    const target = getDefaultRoute(profile.role)
    return <Navigate to={target} replace />
  }
  return <AnimatedPage><RouteWrapper><LandingPage /></RouteWrapper></AnimatedPage>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicRoot />,
  },
  {
    path: '/login',
    element: <AnimatedPage><RouteWrapper><LoginPage /></RouteWrapper></AnimatedPage>,
  },
  {
    path: '/register',
    element: <AnimatedPage><RouteWrapper><RegisterPage /></RouteWrapper></AnimatedPage>,
  },
  {
    path: '/forgot-password',
    element: <AnimatedPage><RouteWrapper><ForgotPasswordPage /></RouteWrapper></AnimatedPage>,
  },
  {
    path: '/reset-password',
    element: <AnimatedPage><RouteWrapper><ResetPasswordPage /></RouteWrapper></AnimatedPage>,
  },
  {
    path: '/pricing',
    element: <AnimatedPage><RouteWrapper><PricingPage /></RouteWrapper></AnimatedPage>,
  },
  {
    path: '/terms',
    element: <AnimatedPage><RouteWrapper><TermsPage /></RouteWrapper></AnimatedPage>,
  },
  {
    path: '/privacy',
    element: <AnimatedPage><RouteWrapper><PrivacyPage /></RouteWrapper></AnimatedPage>,
  },
  {
    path: '/cookies',
    element: <AnimatedPage><RouteWrapper><CookiesPage /></RouteWrapper></AnimatedPage>,
  },
  {
    path: '/auth/callback',
    element: <RouteWrapper><OAuthCallbackPage /></RouteWrapper>,
  },
  {
    path: '/apply/:jobToken',
    element: <AnimatedPage><RouteWrapper><ApplyPage /></RouteWrapper></AnimatedPage>,
  },
  {
    path: '/portal/track/:trackingToken',
    element: <AnimatedPage><RouteWrapper><TrackApplicationPage /></RouteWrapper></AnimatedPage>,
  },
  {
    path: '/setup-company',
    element: (
      <AnimatedPage>
        <CompanySetupGuard>
          <RouteWrapper><CompanySetupPage /></RouteWrapper>
        </CompanySetupGuard>
      </AnimatedPage>
    ),
  },
  {
    element: <AuthGuard><ErrorBoundary><AppLayout /></ErrorBoundary></AuthGuard>,
    children: [
      // ── HR / Admin / Manager routes ──────────────────────────────
      {
        path: '/dashboard',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><DashboardPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/employees',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><EmployeeListPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/employees/:id',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><EmployeeDetailPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/recruitment/candidates',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><CandidatesPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/recruitment/candidates/:id',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><CandidateDetailPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/recruitment/jobs',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><JobsPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/recruitment/jobs/:id',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><JobDetailPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/recruitment/pipeline',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><PipelinePage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/recruitment/interviews',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><InterviewsPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/documents',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><DocumentsPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/documents/sign/:id',
        element: (
          <AuthGuard callInitSession={false} requireCompany={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><DocumentSigningPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/hiring',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><HiringPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/onboarding',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><OnboardingMgmtPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/performance',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><PerformancePage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/okrs',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><OKRPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/attendance',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><AttendancePage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/leave',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><LeavePage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/benefits',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><BenefitsPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/learning',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><LearningPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/engagement',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><EngagementPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/reports',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <FeatureGate featureKey="reports">
              <AnimatedPage><RouteWrapper><ReportsPage /></RouteWrapper></AnimatedPage>
            </FeatureGate>
          </AuthGuard>
        ),
      },
      {
        path: '/people-analytics',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><PeopleAnalyticsPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/messages',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><MessagesPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/notifications',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><NotificationCenterPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/health',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><HealthPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/monitoring',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><GeminiMonitoringPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><SettingsPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/security',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><SecurityPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/compliance',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={['admin']}>
            <AnimatedPage><RouteWrapper><CompliancePage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/notifications',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><NotificationPreferencesPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/audit-log',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={['admin', 'hr']}>
            <AnimatedPage><RouteWrapper><AuditLogPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/import',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><BulkImportPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/import-data',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><ImportPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/export-data',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><ExportPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/pdpa',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><PDPAPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/billing',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><BillingPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/thailand-payroll',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><ThailandPayrollPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      // ── Payroll routes ──────────────────────────────────────────
      {
        path: '/payroll',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><PayrollDashboardPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/payroll/run',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><PayrollRunPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/payroll/run/:runId',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><PayrollRunPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/payroll/payslip/:employeeId',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><RouteWrapper><PayslipPage /></RouteWrapper></AnimatedPage>
          </AuthGuard>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <AnimatedPage><RouteWrapper><NotFoundPage /></RouteWrapper></AnimatedPage>,
  },
])
