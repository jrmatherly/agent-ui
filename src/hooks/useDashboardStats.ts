'use client'

import { useQuery } from '@tanstack/react-query'

export interface DashboardStats {
  /** Number of unique users with active (non-expired) sessions */
  activeSessions: number
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch('/api/dashboard/stats')
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats')
  }
  return response.json()
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000 // Consider data fresh for 10 seconds
  })
}
