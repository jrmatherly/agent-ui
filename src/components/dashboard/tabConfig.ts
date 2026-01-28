import { Role, hasRole } from '@/lib/permissions'

export interface TabConfig {
  id: string
  label: string
  minRole?: Role
}

export const DASHBOARD_TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'team', label: 'Team', minRole: 'teamLead' },
  { id: 'analytics', label: 'Analytics', minRole: 'teamAdmin' },
  { id: 'admin', label: 'Admin', minRole: 'orgAdmin' }
]

export function getVisibleTabs(userRole: Role | undefined): TabConfig[] {
  return DASHBOARD_TABS.filter((tab) => {
    if (!tab.minRole) return true
    if (!userRole) return false
    return hasRole(userRole, tab.minRole)
  })
}
