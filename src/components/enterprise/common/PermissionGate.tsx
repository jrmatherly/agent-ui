'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { hasPermission, hasRole, type Role } from '@/lib/permissions'

interface PermissionGateProps {
  children: ReactNode
  fallback?: ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  role?: Role
}

export function PermissionGate({
  children,
  fallback = null,
  permission,
  permissions,
  requireAll = false,
  role
}: PermissionGateProps) {
  const { permissions: userPermissions, role: userRole } = useAuth()

  // Check role requirement
  if (role && !hasRole(userRole as Role, role)) {
    return <>{fallback}</>
  }

  // Check single permission
  if (permission && !hasPermission(userPermissions, permission)) {
    return <>{fallback}</>
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? permissions.every((p) => hasPermission(userPermissions, p))
      : permissions.some((p) => hasPermission(userPermissions, p))

    if (!hasRequiredPermissions) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}
