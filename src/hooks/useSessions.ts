'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/AuthProvider'
import { useOrgContext } from '@/components/providers/OrgProvider'

export type SessionFilter = 'mine' | 'shared' | 'team'

export interface Session {
  id: string
  name: string | null
  ownerId: string
  ownerEmail: string
  ownerName: string
  orgId: string
  teamId: string | null
  entityType: 'agent' | 'team'
  entityId: string
  entityName: string
  visibility: 'private' | 'team_shared'
  status: string
  messageCount: number
  createdAt: string
  updatedAt: string
  lastMessageAt: string | null
}

async function fetchSessions(
  filter: SessionFilter,
  orgId: string,
  teamId?: string
): Promise<Session[]> {
  const params = new URLSearchParams({ filter, orgId })
  if (teamId) params.set('teamId', teamId)

  const response = await fetch(`/api/sessions?${params}`)
  if (!response.ok) throw new Error('Failed to fetch sessions')
  return response.json()
}

async function shareSessionApi(
  sessionId: string,
  teamId: string
): Promise<Session> {
  const response = await fetch(`/api/sessions/${sessionId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId })
  })
  if (!response.ok) throw new Error('Failed to share session')
  return response.json()
}

async function unshareSessionApi(sessionId: string): Promise<Session> {
  const response = await fetch(`/api/sessions/${sessionId}/unshare`, {
    method: 'POST'
  })
  if (!response.ok) throw new Error('Failed to unshare session')
  return response.json()
}

export function useSessions() {
  const [filter, setFilter] = useState<SessionFilter>('mine')
  const { user } = useAuth()
  const { activeOrg, activeTeam } = useOrgContext()
  const queryClient = useQueryClient()

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', filter, activeOrg?.id, activeTeam?.id],
    queryFn: () =>
      fetchSessions(filter, activeOrg?.id || '', activeTeam?.id || undefined),
    enabled: !!activeOrg?.id
  })

  const shareMutation = useMutation({
    mutationFn: ({
      sessionId,
      teamId
    }: {
      sessionId: string
      teamId: string
    }) => shareSessionApi(sessionId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    }
  })

  const unshareMutation = useMutation({
    mutationFn: (sessionId: string) => unshareSessionApi(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    }
  })

  const isOwner = (session: Session) => session.ownerId === user?.id

  return {
    sessions,
    filter,
    setFilter,
    isLoading,
    shareSession: shareMutation.mutateAsync,
    unshareSession: unshareMutation.mutateAsync,
    isOwner
  }
}
