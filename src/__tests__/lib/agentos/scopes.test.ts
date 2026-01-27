import { describe, it, expect } from 'vitest'
import { getAgnoScopes, ROLE_TO_AGNO_SCOPES } from '@/lib/agentos/scopes'
import type { Role } from '@/lib/permissions'

describe('AgentOS Scope Mapping', () => {
  describe('ROLE_TO_AGNO_SCOPES', () => {
    it('should define scopes for all roles', () => {
      const roles: Role[] = [
        'user',
        'powerUser',
        'teamLead',
        'teamAdmin',
        'orgAdmin',
        'globalAdmin'
      ]

      roles.forEach((role) => {
        expect(ROLE_TO_AGNO_SCOPES[role]).toBeDefined()
        expect(Array.isArray(ROLE_TO_AGNO_SCOPES[role])).toBe(true)
        expect(ROLE_TO_AGNO_SCOPES[role].length).toBeGreaterThan(0)
      })
    })

    it('should include base scopes for user role', () => {
      const scopes = ROLE_TO_AGNO_SCOPES.user

      expect(scopes).toContain('agents:read')
      expect(scopes).toContain('agents:run')
      expect(scopes).toContain('sessions:read')
      expect(scopes).toContain('sessions:write')
    })

    it('should include system:read for powerUser role', () => {
      const scopes = ROLE_TO_AGNO_SCOPES.powerUser

      expect(scopes).toContain('agents:read')
      expect(scopes).toContain('system:read')
    })

    it('should include team scopes for teamLead role', () => {
      const scopes = ROLE_TO_AGNO_SCOPES.teamLead

      expect(scopes).toContain('teams:read')
      expect(scopes).toContain('teams:run')
      expect(scopes).toContain('memories:read')
    })

    it('should include write scopes for teamAdmin role', () => {
      const scopes = ROLE_TO_AGNO_SCOPES.teamAdmin

      expect(scopes).toContain('agents:write')
      expect(scopes).toContain('sessions:delete')
      expect(scopes).toContain('workflows:read')
      expect(scopes).toContain('workflows:run')
    })

    it('should include knowledge and metrics scopes for orgAdmin role', () => {
      const scopes = ROLE_TO_AGNO_SCOPES.orgAdmin

      expect(scopes).toContain('knowledge:read')
      expect(scopes).toContain('knowledge:write')
      expect(scopes).toContain('knowledge:delete')
      expect(scopes).toContain('memories:write')
      expect(scopes).toContain('memories:delete')
      expect(scopes).toContain('metrics:read')
      expect(scopes).toContain('evals:read')
      expect(scopes).toContain('traces:read')
    })

    it('should include admin scope for globalAdmin role', () => {
      const scopes = ROLE_TO_AGNO_SCOPES.globalAdmin

      expect(scopes).toContain('agent_os:admin')
      expect(scopes.length).toBe(1)
    })
  })

  describe('getAgnoScopes', () => {
    it('should return scopes for valid role', () => {
      const scopes = getAgnoScopes('user')

      expect(Array.isArray(scopes)).toBe(true)
      expect(scopes).toContain('agents:read')
    })

    it('should return a copy of scopes (not the original array)', () => {
      const scopes1 = getAgnoScopes('user')
      const scopes2 = getAgnoScopes('user')

      expect(scopes1).not.toBe(scopes2)
      expect(scopes1).toEqual(scopes2)
    })

    it('should return user scopes for invalid role', () => {
      const scopes = getAgnoScopes('invalidRole' as Role)

      expect(scopes).toEqual([...ROLE_TO_AGNO_SCOPES.user])
    })

    it('should return correct scope count for each role', () => {
      expect(getAgnoScopes('user').length).toBe(4)
      expect(getAgnoScopes('powerUser').length).toBe(5)
      expect(getAgnoScopes('teamLead').length).toBe(8)
      expect(getAgnoScopes('teamAdmin').length).toBe(12)
      expect(getAgnoScopes('orgAdmin').length).toBe(20)
      expect(getAgnoScopes('globalAdmin').length).toBe(1)
    })

    it('should maintain hierarchical scope inheritance', () => {
      const userScopes = getAgnoScopes('user')
      const powerUserScopes = getAgnoScopes('powerUser')
      const teamLeadScopes = getAgnoScopes('teamLead')

      // powerUser should have all user scopes
      userScopes.forEach((scope) => {
        expect(powerUserScopes).toContain(scope)
      })

      // teamLead should have all powerUser scopes
      powerUserScopes.forEach((scope) => {
        expect(teamLeadScopes).toContain(scope)
      })
    })
  })
})
