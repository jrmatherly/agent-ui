'use client'

import { useQuery } from '@tanstack/react-query'

export interface AdminAgent {
  id: string
  name: string
  model?: {
    name?: string
    model?: string
    provider?: string
  }
  sessionStats: {
    total: number
    active: number
    lastUsed: string | null
  }
}

async function fetchAgents(): Promise<{ agents: AdminAgent[] }> {
  const response = await fetch('/api/admin/agents')
  if (!response.ok) throw new Error('Failed to fetch agents')
  return response.json()
}

export function useAdminAgents() {
  return useQuery({
    queryKey: ['adminAgents'],
    queryFn: fetchAgents,
    refetchInterval: 60000,
    staleTime: 30000
  })
}
