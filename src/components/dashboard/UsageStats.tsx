'use client'

import { useStore } from '@/store'
import { Card } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: string | number
  trend?: string
}

function StatCard({ label, value, trend }: StatCardProps) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {trend && <p className="text-muted-foreground text-xs">{trend}</p>}
    </div>
  )
}

export function UsageStats() {
  const agents = useStore((state) => state.agents)
  const teams = useStore((state) => state.teams)
  const sessionsData = useStore((state) => state.sessionsData)

  const sessionCount = sessionsData?.length ?? 0
  const agentCount = agents?.length ?? 0
  const teamCount = teams?.length ?? 0

  return (
    <Card className="p-6">
      <h3 className="mb-4 font-semibold">Usage Statistics</h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Sessions" value={sessionCount} />
        <StatCard label="Agents" value={agentCount} />
        <StatCard label="Teams" value={teamCount} />
        <StatCard
          label="Status"
          value={agentCount > 0 ? 'Connected' : 'Offline'}
        />
      </div>
    </Card>
  )
}
