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
  UserCircle,
  ClipboardList,
  ClipboardCheck,
  Shield,
  ScrollText,
  Bell,
  ArrowDownToLine,
  Lock,
  type LucideIcon,
} from 'lucide-react'

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
  // ── HR / Admin / Manager ─────────────────────────────────────
  {
    path: '/dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    roles: HR_ROLES,
  },
  {
    labelKey: 'nav.recruitment',
    icon: Briefcase,
    roles: HR_ROLES,
    children: [
      { path: '/recruitment/jobs', labelKey: 'nav.jobs', icon: Briefcase, roles: HR_ROLES },
      { path: '/recruitment/candidates', labelKey: 'nav.candidates', icon: Users, roles: HR_ROLES },
      { path: '/recruitment/pipeline', labelKey: 'nav.pipeline', icon: Kanban, roles: HR_ROLES },
      { path: '/recruitment/interviews', labelKey: 'nav.interviews', icon: CalendarCheck, roles: HR_ROLES },
    ],
  },
  { path: '/hiring', labelKey: 'nav.hiring', icon: FileCheck, roles: HR_ROLES },
  { path: '/onboarding', labelKey: 'nav.onboarding', icon: UserCheck, roles: HR_ROLES },
  { path: '/documents', labelKey: 'nav.documents', icon: FileText, roles: HR_ROLES },
  { path: '/reports', labelKey: 'nav.reports', icon: BarChart2, roles: HR_ROLES },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings, roles: HR_ROLES },
  { path: '/settings/notifications', labelKey: 'nav.notifications', icon: Bell, roles: HR_ROLES },
  { path: '/settings/security', labelKey: 'nav.security', icon: Shield, roles: HR_ROLES },
  { path: '/settings/audit-log', labelKey: 'nav.audit_log', icon: ScrollText, roles: ['admin', 'hr'] },
  { path: '/settings/import', labelKey: 'nav.import_export', icon: ArrowDownToLine, roles: HR_ROLES },
  { path: '/settings/pdpa', labelKey: 'nav.privacy_data', icon: Lock, roles: HR_ROLES },

  // ── Applicant ─────────────────────────────────────────────────
  {
    path: '/applicant/dashboard',
    labelKey: 'nav.applicant_dashboard',
    icon: LayoutDashboard,
    roles: ['applicant'],
  },
  {
    path: '/applicant/jobs',
    labelKey: 'nav.browse_jobs',
    icon: Briefcase,
    roles: ['applicant'],
  },
  {
    path: '/applicant/status',
    labelKey: 'nav.my_applications',
    icon: ClipboardCheck,
    roles: ['applicant'],
  },
  {
    path: '/my-profile',
    labelKey: 'nav.my_profile',
    icon: UserCircle,
    roles: ['applicant'],
  },
  {
    path: '/my-tasks',
    labelKey: 'nav.my_tasks',
    icon: ClipboardList,
    roles: ['applicant'],
  },
]
