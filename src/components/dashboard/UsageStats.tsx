'use client'

import { useStore } from '@/store'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { MessageSquare, Bot, Users2 } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
}

function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <div className="hover:bg-accent/30 group p-6 transition-colors">
      <div className="text-muted-foreground flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium tracking-wider uppercase">
          {label}
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

export function UsageStats() {
  const agents = useStore((state) => state.agents)
  const teams = useStore((state) => state.teams)
  const sessionsData = useStore((state) => state.sessionsData)
  const isEndpointLoading = useStore((state) => state.isEndpointLoading)

  const sessionCount = sessionsData?.length ?? 0
  const agentCount = agents?.length ?? 0
  const teamCount = teams?.length ?? 0
  const isConnected = agentCount > 0

  // Determine status: loading, connected, or offline
  const getStatus = (): 'pending' | 'online' | 'offline' => {
    if (isEndpointLoading) return 'pending'
    if (isConnected) return 'online'
    return 'offline'
  }

  return (
    <Card className="overflow-hidden">
      {/* Header with connection status */}
      <div className="border-border/50 flex items-center justify-between border-b px-6 py-4">
        <h3 className="font-semibold tracking-tight">Usage Statistics</h3>
        <StatusBadge status={getStatus()} />
      </div>

      {/* Stats Grid */}
      <div className="divide-border/50 grid grid-cols-3 divide-x">
        <StatCard
          label="Active Sessions"
          value={sessionCount}
          icon={MessageSquare}
        />
        <StatCard label="Agents" value={agentCount} icon={Bot} />
        <StatCard label="Teams" value={teamCount} icon={Users2} />
      </div>

      {/* Loading message */}
      {isEndpointLoading && (
        <div className="border-border/50 border-t bg-blue-500/5 px-6 py-3">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Connecting to AgentOS...
          </p>
        </div>
      )}

      {/* Offline call-to-action */}
      {!isConnected && !isEndpointLoading && (
        <div className="border-border/50 border-t bg-amber-500/5 px-6 py-3">
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Connect to an AgentOS instance to see live statistics. Check your
            endpoint configuration in settings.
          </p>
        </div>
      )}
    </Card>
  )
}
