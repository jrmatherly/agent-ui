'use client'

import { useQuery } from '@tanstack/react-query'

export interface SystemInfo {
  health: {
    agentOS: { status: 'healthy' | 'unhealthy' | 'unknown'; latency?: number }
    database: { status: 'healthy' | 'unhealthy' }
  }
  config: {
    agentOSUrl: string
    ssoProvidersCount: number
    webhooksCount: number
  }
  version: {
    app: string
    node: string
  }
}

async function fetchSystemInfo(): Promise<SystemInfo> {
  const response = await fetch('/api/admin/system')
  if (!response.ok) throw new Error('Failed to fetch system info')
  return response.json()
}

export function useAdminSystem() {
  return useQuery({
    queryKey: ['adminSystem'],
    queryFn: fetchSystemInfo,
    refetchInterval: 30000,
    staleTime: 10000
  })
}
