import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  getPermissionsForRole,
  hasRole,
  canDelegateRole,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS
} from '@/lib/permissions'

describe('Permissions System', () => {
  describe('getPermissionsForRole', () => {
    it('should return correct permissions for user role', () => {
      const permissions = getPermissionsForRole('user')

      expect(permissions).toContain('agent:use')
      expect(permissions).not.toContain('member:invite')
      expect(permissions).not.toContain('organization:update')
    })

    it('should return correct permissions for teamLead role', () => {
      const permissions = getPermissionsForRole('teamLead')

      expect(permissions).toContain('agent:use')
      expect(permissions).toContain('session:view:team')
      expect(permissions).toContain('member:invite')
      expect(permissions).not.toContain('organization:update')
    })

    it('should return correct permissions for orgAdmin role', () => {
      const permissions = getPermissionsForRole('orgAdmin')

      expect(permissions).toContain('organization:update')
      expect(permissions).toContain('member:*')
      expect(permissions).toContain('audit:view:bu')
    })

    it('should return all permissions wildcard for globalAdmin role', () => {
      const permissions = getPermissionsForRole('globalAdmin')

      expect(permissions).toContain('*')
    })
  })

  describe('hasPermission', () => {
    it('should return true for exact permission match', () => {
      const userPermissions = ['agent:use', 'session:share']

      expect(hasPermission(userPermissions, 'agent:use')).toBe(true)
      expect(hasPermission(userPermissions, 'session:share')).toBe(true)
    })

    it('should return false for missing permission', () => {
      const userPermissions = ['agent:use']

      expect(hasPermission(userPermissions, 'member:invite')).toBe(false)
    })

    it('should handle wildcard permissions', () => {
      const adminPermissions = ['member:*']

      expect(hasPermission(adminPermissions, 'member:invite')).toBe(true)
      expect(hasPermission(adminPermissions, 'member:remove')).toBe(true)
      expect(hasPermission(adminPermissions, 'agent:create')).toBe(false)
    })

    it('should handle global wildcard', () => {
      const globalAdminPermissions = ['*']

      expect(hasPermission(globalAdminPermissions, 'anything')).toBe(true)
      expect(hasPermission(globalAdminPermissions, 'member:invite')).toBe(true)
    })

    it('should handle nested wildcard permissions', () => {
      const permissions = ['agent:*']

      expect(hasPermission(permissions, 'agent:use')).toBe(true)
      expect(hasPermission(permissions, 'agent:create')).toBe(true)
      expect(hasPermission(permissions, 'agent:configure:self')).toBe(true)
      expect(hasPermission(permissions, 'member:invite')).toBe(false)
    })
  })

  describe('hasRole', () => {
    it('should return true when user has required role', () => {
      expect(hasRole('teamLead', 'user')).toBe(true)
      expect(hasRole('orgAdmin', 'teamLead')).toBe(true)
      expect(hasRole('globalAdmin', 'orgAdmin')).toBe(true)
    })

    it('should return true when user has exact role', () => {
      expect(hasRole('user', 'user')).toBe(true)
      expect(hasRole('orgAdmin', 'orgAdmin')).toBe(true)
    })

    it('should return false when user lacks required role', () => {
      expect(hasRole('user', 'teamLead')).toBe(false)
      expect(hasRole('teamLead', 'orgAdmin')).toBe(false)
    })
  })

  describe('canDelegateRole', () => {
    it('should allow teamLead to delegate user and powerUser', () => {
      expect(canDelegateRole('teamLead', 'user')).toBe(true)
      expect(canDelegateRole('teamLead', 'powerUser')).toBe(true)
      expect(canDelegateRole('teamLead', 'teamAdmin')).toBe(false)
    })

    it('should allow orgAdmin to delegate up to teamAdmin', () => {
      expect(canDelegateRole('orgAdmin', 'user')).toBe(true)
      expect(canDelegateRole('orgAdmin', 'teamAdmin')).toBe(true)
      expect(canDelegateRole('orgAdmin', 'orgAdmin')).toBe(false)
    })

    it('should allow globalAdmin to delegate any role', () => {
      expect(canDelegateRole('globalAdmin', 'user')).toBe(true)
      expect(canDelegateRole('globalAdmin', 'orgAdmin')).toBe(true)
      expect(canDelegateRole('globalAdmin', 'globalAdmin')).toBe(true)
    })

    it('should prevent user and powerUser from delegating', () => {
      expect(canDelegateRole('user', 'user')).toBe(false)
      expect(canDelegateRole('powerUser', 'user')).toBe(false)
    })
  })

  describe('ROLE_HIERARCHY', () => {
    it('should have correct hierarchy ordering', () => {
      expect(ROLE_HIERARCHY.user).toBeLessThan(ROLE_HIERARCHY.powerUser)
      expect(ROLE_HIERARCHY.powerUser).toBeLessThan(ROLE_HIERARCHY.teamLead)
      expect(ROLE_HIERARCHY.teamLead).toBeLessThan(ROLE_HIERARCHY.teamAdmin)
      expect(ROLE_HIERARCHY.teamAdmin).toBeLessThan(ROLE_HIERARCHY.orgAdmin)
      expect(ROLE_HIERARCHY.orgAdmin).toBeLessThan(ROLE_HIERARCHY.globalAdmin)
    })
  })

  describe('ROLE_PERMISSIONS', () => {
    it('should define permissions for all roles', () => {
      expect(ROLE_PERMISSIONS.user).toBeDefined()
      expect(ROLE_PERMISSIONS.powerUser).toBeDefined()
      expect(ROLE_PERMISSIONS.teamLead).toBeDefined()
      expect(ROLE_PERMISSIONS.teamAdmin).toBeDefined()
      expect(ROLE_PERMISSIONS.orgAdmin).toBeDefined()
      expect(ROLE_PERMISSIONS.globalAdmin).toBeDefined()
    })
  })
})
