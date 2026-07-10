import {
  LayoutDashboard,
  Briefcase,
  Users,
  Kanban,
  FileCheck,
  UserCheck,
  BarChart2,
  Settings,
  CalendarCheck,
  FileText,
  Shield,
  ScrollText,
  Bell,
  ArrowDownToLine,
  Lock,
  MessageSquare,
  User,
  Clock,
  Wallet,
  Zap,
  Heart,
  GraduationCap,
  Calendar,
  Gift,
  Activity,
  type LucideIcon,
} from 'lucide-react'

/** Returns the correct landing route based on user role from DB. */
export function getDefaultRoute(_role?: string | null): string {
  return '/dashboard'
}

export interface NavItem {
  path?: string
  labelKey: string
  icon: LucideIcon
  /** Roles that can see this item. Omit to show to all authenticated users. */
  roles?: string[]
  children?: NavItem[]
}

/** HR / Admin / Manager navigation */
const HR_ROLES = ['admin', 'hr', 'manager']

export const navItems: NavItem[] = [
  // ── Primary ─────────────────────────────────────────────────
  {
    path: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    roles: HR_ROLES,
  },

  // ── Recruitment ─────────────────────────────────────────────
  {
    labelKey: 'nav.recruitment',
    icon: Briefcase,
    roles: HR_ROLES,
    children: [
      { path: '/recruitment/jobs', labelKey: 'nav.jobs', icon: Briefcase, roles: HR_ROLES },
      { path: '/recruitment/candidates', labelKey: 'nav.candidates', icon: Users, roles: HR_ROLES },
      { path: '/recruitment/pipeline', labelKey: 'nav.pipeline', icon: Kanban, roles: HR_ROLES },
      { path: '/recruitment/interviews', labelKey: 'nav.interviews', icon: CalendarCheck, roles: HR_ROLES },
      { path: '/hiring', labelKey: 'nav.hiring', icon: FileCheck, roles: HR_ROLES },
    ],
  },

  // ── People ──────────────────────────────────────────────────
  {
    labelKey: 'nav.people',
    icon: Users,
    roles: HR_ROLES,
    children: [
      { path: '/employees', labelKey: 'nav.employees', icon: Users, roles: HR_ROLES },
      { path: '/onboarding', labelKey: 'nav.onboarding', icon: UserCheck, roles: HR_ROLES },
      { path: '/documents', labelKey: 'nav.documents', icon: FileText, roles: HR_ROLES },
      { path: '/attendance', labelKey: 'nav.attendance', icon: Clock, roles: HR_ROLES },
      { path: '/leave', labelKey: 'nav.leave', icon: Calendar, roles: HR_ROLES },
    ],
  },

  // ── Payroll & Benefits ──────────────────────────────────────
  {
    labelKey: 'nav.payroll_benefits',
    icon: Wallet,
    roles: HR_ROLES,
    children: [
      { path: '/payroll', labelKey: 'nav.payroll', icon: Wallet, roles: HR_ROLES },
      { path: '/benefits', labelKey: 'nav.benefits', icon: Gift, roles: HR_ROLES },
    ],
  },

  // ── Performance & Growth ────────────────────────────────────
  {
    labelKey: 'nav.performance',
    icon: Activity,
    roles: HR_ROLES,
    children: [
      { path: '/performance', labelKey: 'nav.reviews', icon: Activity, roles: HR_ROLES },
      { path: '/okrs', labelKey: 'nav.okrs', icon: BarChart2, roles: HR_ROLES },
      { path: '/learning', labelKey: 'nav.learning', icon: GraduationCap, roles: HR_ROLES },
      { path: '/engagement', labelKey: 'nav.engagement', icon: Heart, roles: HR_ROLES },
    ],
  },

  // ── Analytics & Reports ─────────────────────────────────────
  {
    path: '/reports',
    labelKey: 'nav.reports',
    icon: BarChart2,
    roles: HR_ROLES,
  },
  {
    path: '/analytics',
    labelKey: 'nav.analytics',
    icon: BarChart2,
    roles: HR_ROLES,
  },

  // ── Communication ───────────────────────────────────────────
  {
    path: '/messages',
    labelKey: 'nav.messages',
    icon: MessageSquare,
    roles: HR_ROLES,
  },

  // ── Automation ──────────────────────────────────────────────
  {
    path: '/automation',
    labelKey: 'nav.automation',
    icon: Zap,
    roles: HR_ROLES,
  },

  // ── Settings ────────────────────────────────────────────────
  {
    labelKey: 'nav.settings',
    icon: Settings,
    roles: HR_ROLES,
    children: [
      { path: '/settings', labelKey: 'nav.general', icon: Settings, roles: HR_ROLES },
      { path: '/settings/notifications', labelKey: 'nav.notifications', icon: Bell, roles: HR_ROLES },
      { path: '/settings/security', labelKey: 'nav.security', icon: Shield, roles: HR_ROLES },
      { path: '/settings/compliance', labelKey: 'nav.compliance', icon: Shield, roles: HR_ROLES },
      { path: '/settings/audit-log', labelKey: 'nav.audit_log', icon: ScrollText, roles: ['admin', 'hr'] },
      { path: '/settings/import', labelKey: 'nav.import_export', icon: ArrowDownToLine, roles: HR_ROLES },
      { path: '/settings/pdpa', labelKey: 'nav.privacy_data', icon: Lock, roles: HR_ROLES },
      { path: '/settings/billing', labelKey: 'nav.billing', icon: Wallet, roles: HR_ROLES },
      { path: '/settings/line', labelKey: 'nav.line_integration', icon: MessageSquare, roles: HR_ROLES },
    ],
  },

  // ── Employee Self-Service ───────────────────────────────────
  {
    path: '/portal',
    labelKey: 'nav.employee_portal',
    icon: User,
  },
  {
    path: '/portal/profile',
    labelKey: 'nav.my_profile',
    icon: User,
  },
  {
    path: '/portal/time-off',
    labelKey: 'nav.time_off',
    icon: Clock,
  },
  {
    path: '/portal/payslips',
    labelKey: 'nav.payslips',
    icon: Wallet,
  },
]
