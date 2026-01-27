'use client'

import { useMemo } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { hasPermission } from '@/lib/permissions'

export interface UIPermissions {
  nav: {
    chat: boolean
    agents: boolean
    teams: boolean
    knowledgeBases: boolean
    sessions: boolean
    admin: boolean
    globalSettings: boolean
  }
  actions: {
    createAgent: boolean
    shareAgent: boolean
    deleteAgent: boolean
    inviteMember: boolean
    removeMember: boolean
    exportSession: boolean
    shareSession: boolean
    viewAuditLogs: boolean
    manageIntegrations: boolean
    manageQuotas: boolean
  }
  data: {
    showOtherTeamAgents: boolean
    showAllSessions: boolean
    showTeamSessions: boolean
    showUsageMetrics: boolean
    showCostData: boolean
    showAuditLogs: boolean
  }
}

export function useUIPermissions(): UIPermissions {
  const { permissions, role } = useAuth()

  return useMemo(
    () => ({
      nav: {
        chat: true,
        agents: true,
        teams: hasPermission(permissions, 'member:invite'),
        knowledgeBases: hasPermission(permissions, 'knowledge:upload:personal'),
        sessions: true,
        admin: hasPermission(permissions, 'team:manage'),
        globalSettings: role === 'globalAdmin'
      },
      actions: {
        createAgent: hasPermission(permissions, 'agent:create'),
        shareAgent: hasPermission(permissions, 'agent:share'),
        deleteAgent: hasPermission(permissions, 'agent:delete'),
        inviteMember: hasPermission(permissions, 'member:invite'),
        removeMember: hasPermission(permissions, 'member:remove'),
        exportSession: hasPermission(permissions, 'session:export:own'),
        shareSession: hasPermission(permissions, 'session:share'),
        viewAuditLogs: hasPermission(permissions, 'audit:view:bu'),
        manageIntegrations: hasPermission(permissions, 'integration:configure'),
        manageQuotas: hasPermission(permissions, 'quota:manage')
      },
      data: {
        showOtherTeamAgents: hasPermission(permissions, 'agent:*'),
        showAllSessions: role === 'globalAdmin',
        showTeamSessions: hasPermission(permissions, 'session:view:team'),
        showUsageMetrics: hasPermission(permissions, 'team:manage'),
        showCostData: hasPermission(permissions, 'organization:update'),
        showAuditLogs: hasPermission(permissions, 'audit:view:bu')
      }
    }),
    [permissions, role]
  )
}
