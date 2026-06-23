import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy } from 'react'
import { AuthGuard, CompanySetupGuard, getDefaultRoute } from './AuthGuard'
import { FeatureGate } from '../components/common/FeatureGate'
import { AppLayout } from '../components/layout/AppLayout'
import { ErrorBoundary } from '../components/common/ErrorBoundary'
import { AnimatedPage } from '../components/shared/AnimatedPage'
import { useAuthStore } from '../stores/authStore'

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
const ApplyPage = lazy(() => import('../pages/portal/ApplyPage'))
const TrackApplicationPage = lazy(() => import('../pages/portal/TrackApplicationPage'))

const HR_ROLES = ['admin', 'hr', 'manager']

function PublicRoot() {
  const profile = useAuthStore(s => s.profile)
  if (profile) {
    const target = getDefaultRoute(profile.role)
    return <Navigate to={target} replace />
  }
  return <AnimatedPage><LandingPage /></AnimatedPage>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicRoot />,
  },
  {
    path: '/login',
    element: <AnimatedPage><LoginPage /></AnimatedPage>,
  },
  {
    path: '/register',
    element: <AnimatedPage><RegisterPage /></AnimatedPage>,
  },
  {
    path: '/forgot-password',
    element: <AnimatedPage><ForgotPasswordPage /></AnimatedPage>,
  },
  {
    path: '/reset-password',
    element: <AnimatedPage><ResetPasswordPage /></AnimatedPage>,
  },
  {
    path: '/pricing',
    element: <AnimatedPage><PricingPage /></AnimatedPage>,
  },
  {
    path: '/terms',
    element: <AnimatedPage><TermsPage /></AnimatedPage>,
  },
  {
    path: '/privacy',
    element: <AnimatedPage><PrivacyPage /></AnimatedPage>,
  },
  {
    path: '/cookies',
    element: <AnimatedPage><CookiesPage /></AnimatedPage>,
  },
  {
    path: '/auth/callback',
    element: <OAuthCallbackPage />,
  },
  {
    path: '/apply/:jobToken',
    element: <AnimatedPage><ApplyPage /></AnimatedPage>,
  },
  {
    path: '/portal/track/:trackingToken',
    element: <AnimatedPage><TrackApplicationPage /></AnimatedPage>,
  },
  {
    path: '/setup-company',
    element: (
      <AnimatedPage>
        <CompanySetupGuard>
          <CompanySetupPage />
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
            <AnimatedPage><DashboardPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/recruitment/candidates',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><CandidatesPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/recruitment/candidates/:id',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><CandidateDetailPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/recruitment/jobs',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><JobsPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/recruitment/jobs/:id',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><JobDetailPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/recruitment/pipeline',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><PipelinePage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/recruitment/interviews',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><InterviewsPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/documents',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><DocumentsPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/documents/sign/:id',
        element: (
          <AuthGuard callInitSession={false} requireCompany={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><DocumentSigningPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/hiring',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><HiringPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/onboarding',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><OnboardingMgmtPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/performance',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><PerformancePage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/okrs',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><OKRPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/attendance',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><AttendancePage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/leave',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><LeavePage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/benefits',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><BenefitsPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/learning',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><LearningPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/engagement',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><EngagementPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/reports',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <FeatureGate featureKey="reports">
              <AnimatedPage><ReportsPage /></AnimatedPage>
            </FeatureGate>
          </AuthGuard>
        ),
      },
      {
        path: '/people-analytics',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><PeopleAnalyticsPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/health',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><HealthPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/monitoring',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><GeminiMonitoringPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><SettingsPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/security',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><SecurityPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/compliance',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={['admin']}>
            <AnimatedPage><CompliancePage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/notifications',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><NotificationPreferencesPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/audit-log',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={['admin', 'hr']}>
            <AnimatedPage><AuditLogPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/import',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><BulkImportPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/import-data',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><ImportPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/export-data',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><ExportPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/pdpa',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><PDPAPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/billing',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><BillingPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
      {
        path: '/settings/thailand-payroll',
        element: (
          <AuthGuard callInitSession={false} requiredRoles={HR_ROLES}>
            <AnimatedPage><ThailandPayrollPage /></AnimatedPage>
          </AuthGuard>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <AnimatedPage><NotFoundPage /></AnimatedPage>,
  },
])
