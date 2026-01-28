'use client'

import { useQuery } from '@tanstack/react-query'

export interface UsageMetrics {
  sessions: {
    total: number
    today: number
    thisWeek: number
    thisMonth: number
    byEntityType: Record<string, number>
    avgMessageCount: number
  }
  users: {
    total: number
    newThisWeek: number
    byRole: Record<string, number>
  }
  knowledge: {
    totalBases: number
    totalDocuments: number
    totalSizeBytes: number
  }
}

async function fetchUsage(): Promise<UsageMetrics> {
  const response = await fetch('/api/admin/usage')
  if (!response.ok) throw new Error('Failed to fetch usage metrics')
  return response.json()
}

export function useAdminUsage() {
  return useQuery({
    queryKey: ['adminUsage'],
    queryFn: fetchUsage,
    refetchInterval: 60000,
    staleTime: 30000
  })
}
