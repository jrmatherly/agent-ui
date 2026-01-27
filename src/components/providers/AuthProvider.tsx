'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSession, useActiveOrganization } from '@/lib/auth-client'

interface AuthContextType {
  user: {
    id: string
    name: string
    email: string
    role: string
  } | null
  isLoading: boolean
  isAuthenticated: boolean
  organization: {
    id: string
    name: string
    slug: string
  } | null
  role: string
  permissions: string[]
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: isSessionLoading } = useSession()
  const { data: organization, isPending: isOrgLoading } =
    useActiveOrganization()

  const isLoading = isSessionLoading || isOrgLoading
  const isAuthenticated = !!session?.user

  // Derive permissions from role
  const role = (session?.user as { role?: string } | undefined)?.role || 'user'
  const permissions = getPermissionsForRole(role)

  const user = session?.user
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role
      }
    : null

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        organization: organization
          ? {
              id: organization.id,
              name: organization.name,
              slug: organization.slug
            }
          : null,
        role,
        permissions
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

function getPermissionsForRole(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    user: ['agent:use'],
    powerUser: [
      'agent:use',
      'agent:configure:self',
      'knowledge:upload:personal',
      'session:share'
    ],
    teamLead: [
      'agent:use',
      'agent:configure:self',
      'knowledge:upload:personal',
      'session:share',
      'member:invite',
      'member:remove',
      'session:view:team'
    ],
    teamAdmin: [
      'agent:use',
      'agent:configure:self',
      'knowledge:upload:personal',
      'session:share',
      'member:invite',
      'member:remove',
      'session:view:team',
      'agent:create',
      'agent:share',
      'team:manage',
      'knowledge:upload:team'
    ],
    orgAdmin: [
      'agent:*',
      'member:*',
      'team:*',
      'organization:update',
      'knowledge:*',
      'session:view:bu',
      'audit:view:bu'
    ],
    globalAdmin: ['*']
  }

  return rolePermissions[role] || rolePermissions.user
}

export function hasPermission(
  permissions: string[],
  required: string
): boolean {
  if (permissions.includes('*')) return true
  if (permissions.includes(required)) return true

  // Check wildcard permissions (e.g., 'agent:*' matches 'agent:create')
  const [resource] = required.split(':')
  if (permissions.includes(`${resource}:*`)) return true

  return false
}
