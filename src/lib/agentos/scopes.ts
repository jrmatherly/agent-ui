import type { Role } from '@/lib/permissions'

/**
 * Maps agent-ui roles to Agno RBAC scopes.
 *
 * Scope format: resource:action or resource:<id>:action
 * See: https://docs.agno.com/agent-os/security/rbac
 */

const BASE_USER_SCOPES = [
  'agents:read',
  'agents:run',
  'sessions:read',
  'sessions:write'
] as const

const POWER_USER_SCOPES = [...BASE_USER_SCOPES, 'system:read'] as const

const TEAM_LEAD_SCOPES = [
  ...POWER_USER_SCOPES,
  'teams:read',
  'teams:run',
  'memories:read'
] as const

const TEAM_ADMIN_SCOPES = [
  ...TEAM_LEAD_SCOPES,
  'agents:write',
  'sessions:delete',
  'workflows:read',
  'workflows:run'
] as const

const ORG_ADMIN_SCOPES = [
  ...TEAM_ADMIN_SCOPES,
  'knowledge:read',
  'knowledge:write',
  'knowledge:delete',
  'memories:write',
  'memories:delete',
  'metrics:read',
  'evals:read',
  'traces:read'
] as const

const GLOBAL_ADMIN_SCOPES = ['agent_os:admin'] as const

export const ROLE_TO_AGNO_SCOPES: Record<Role, readonly string[]> = {
  user: BASE_USER_SCOPES,
  powerUser: POWER_USER_SCOPES,
  teamLead: TEAM_LEAD_SCOPES,
  teamAdmin: TEAM_ADMIN_SCOPES,
  orgAdmin: ORG_ADMIN_SCOPES,
  globalAdmin: GLOBAL_ADMIN_SCOPES
}

export function getAgnoScopes(role: Role): string[] {
  return [...(ROLE_TO_AGNO_SCOPES[role] || ROLE_TO_AGNO_SCOPES.user)]
}
