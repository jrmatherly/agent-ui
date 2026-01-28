'use client'

import { useStore } from '@/store'
import { StatusBadge } from '@/components/ui/status-badge'

export function ConnectionStatus() {
  const agents = useStore((state) => state.agents)
  const isEndpointLoading = useStore((state) => state.isEndpointLoading)

  const isConnected = (agents?.length ?? 0) > 0

  const getStatus = (): 'pending' | 'online' | 'offline' => {
    if (isEndpointLoading) return 'pending'
    if (isConnected) return 'online'
    return 'offline'
  }

  return <StatusBadge status={getStatus()} size="sm" />
}
