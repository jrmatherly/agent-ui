export type Role =
  | 'user'
  | 'powerUser'
  | 'teamLead'
  | 'teamAdmin'
  | 'orgAdmin'
  | 'globalAdmin'

export const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  powerUser: 1,
  teamLead: 2,
  teamAdmin: 3,
  orgAdmin: 4,
  globalAdmin: 5
}

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  user: ['agent:use'],
  powerUser: [
    'agent:use',
    'agent:configure:self',
    'knowledge:upload:personal',
    'session:share',
    'session:export:own'
  ],
  teamLead: [
    'agent:use',
    'agent:configure:self',
    'knowledge:upload:personal',
    'session:share',
    'session:export:own',
    'member:invite',
    'member:remove',
    'session:view:team'
  ],
  teamAdmin: [
    'agent:use',
    'agent:configure:self',
    'knowledge:upload:personal',
    'session:share',
    'session:export:own',
    'member:invite',
    'member:remove',
    'session:view:team',
    'agent:create',
    'agent:delete',
    'agent:share',
    'team:manage',
    'knowledge:create:team',
    'knowledge:upload:team',
    'webhook:create:team',
    'integration:view'
  ],
  orgAdmin: [
    'agent:*',
    'member:*',
    'team:*',
    'organization:update',
    'knowledge:*',
    'session:view:bu',
    'audit:view:bu',
    'webhook:create:bu',
    'integration:configure',
    'quota:manage'
  ],
  globalAdmin: ['*']
}

export function hasPermission(
  userPermissions: string[],
  required: string
): boolean {
  // Global admin wildcard
  if (userPermissions.includes('*')) return true

  // Exact match
  if (userPermissions.includes(required)) return true

  // Wildcard match (e.g., 'agent:*' matches 'agent:create')
  const parts = required.split(':')
  for (let i = parts.length - 1; i >= 0; i--) {
    const wildcardPermission = [...parts.slice(0, i), '*'].join(':')
    if (userPermissions.includes(wildcardPermission)) return true
  }

  return false
}

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export function getPermissionsForRole(role: Role): string[] {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user
}

export function canDelegateRole(
  delegatorRole: Role,
  targetRole: Role
): boolean {
  const delegationRules: Record<Role, Role[]> = {
    user: [],
    powerUser: [],
    teamLead: ['user', 'powerUser'],
    teamAdmin: ['user', 'powerUser', 'teamLead'],
    orgAdmin: ['user', 'powerUser', 'teamLead', 'teamAdmin'],
    globalAdmin: [
      'user',
      'powerUser',
      'teamLead',
      'teamAdmin',
      'orgAdmin',
      'globalAdmin'
    ]
  }

  return delegationRules[delegatorRole]?.includes(targetRole) || false
}
