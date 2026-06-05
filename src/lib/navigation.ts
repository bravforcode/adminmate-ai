import {
  LayoutDashboard,
  Briefcase,
  Users,
  Kanban,
  FileCheck,
  UserCheck,
  MessageSquare,
  BarChart2,
  Settings,
  CalendarCheck,
  FileText,
  UserCircle,
  ClipboardList,
} from 'lucide-react'

export interface NavItem {
  path?: string
  labelKey: string
  icon: any
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
  { path: '/chat', labelKey: 'nav.ai_assistant', icon: MessageSquare, roles: HR_ROLES },
  { path: '/reports', labelKey: 'nav.reports', icon: BarChart2, roles: HR_ROLES },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings, roles: HR_ROLES },

  // ── Applicant ─────────────────────────────────────────────────
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
  {
    path: '/chat',
    labelKey: 'nav.ai_assistant',
    icon: MessageSquare,
    roles: ['applicant'],
  },
]
