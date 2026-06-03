import { LayoutDashboard, Briefcase, Users, Kanban, FileCheck, UserCheck, MessageSquare, BarChart2, Settings, CalendarCheck } from 'lucide-react'

export interface NavItem {
  path?: string
  labelKey: string
  icon: any
  children?: NavItem[]
}

export const navItems: NavItem[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  {
    labelKey: 'nav.recruitment',
    icon: Briefcase,
    children: [
      { path: '/recruitment/jobs', labelKey: 'nav.jobs', icon: Briefcase },
      { path: '/recruitment/candidates', labelKey: 'nav.candidates', icon: Users },
      { path: '/recruitment/pipeline', labelKey: 'nav.pipeline', icon: Kanban },
      { path: '/recruitment/interviews', labelKey: 'nav.interviews', icon: CalendarCheck },
    ],
  },
  { path: '/hiring', labelKey: 'nav.hiring', icon: FileCheck },
  { path: '/onboarding', labelKey: 'nav.onboarding', icon: UserCheck },
  { path: '/chat', labelKey: 'nav.ai_assistant', icon: MessageSquare },
  { path: '/reports', labelKey: 'nav.reports', icon: BarChart2 },
  { path: '/settings', labelKey: 'nav.settings', icon: Settings },
]
