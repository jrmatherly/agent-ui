'use client'

import { Card } from '@/components/ui/card'

interface MetricCardProps {
  label: string
  value: string | number
  description?: string
}

function MetricCard({ label, value, description }: MetricCardProps) {
  return (
    <Card className="p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {description && (
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      )}
    </Card>
  )
}

export function AdminMetrics() {
  // In a real implementation, this would fetch from an admin API
  const metrics = {
    totalUsers: 24,
    activeUsers: 12,
    totalAgents: 8,
    totalSessions: 156,
    avgSessionDuration: '12m',
    errorRate: '0.3%'
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold">System Overview</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Total Users"
            value={metrics.totalUsers}
            description="Registered users"
          />
          <MetricCard
            label="Active Users"
            value={metrics.activeUsers}
            description="Active in last 24h"
          />
          <MetricCard
            label="Total Agents"
            value={metrics.totalAgents}
            description="Configured agents"
          />
          <MetricCard
            label="Total Sessions"
            value={metrics.totalSessions}
            description="All time"
          />
          <MetricCard
            label="Avg Session Duration"
            value={metrics.avgSessionDuration}
            description="Last 7 days"
          />
          <MetricCard
            label="Error Rate"
            value={metrics.errorRate}
            description="Last 24h"
          />
        </div>
      </div>
    </div>
  )
}
