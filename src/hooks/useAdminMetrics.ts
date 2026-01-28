'use client'

import { useQuery } from '@tanstack/react-query'

export interface AdminMetrics {
  totalUsers: number
  activeUsers: number
  totalAgents: number
  totalSessions: number
  avgSessionDuration: string
  errorRate: string
}

async function fetchAdminMetrics(): Promise<AdminMetrics> {
  const response = await fetch('/api/admin/metrics')
  if (!response.ok) {
    throw new Error('Failed to fetch admin metrics')
  }
  return response.json()
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: ['adminMetrics'],
    queryFn: fetchAdminMetrics,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000 // Consider data fresh for 10 seconds
  })
}
