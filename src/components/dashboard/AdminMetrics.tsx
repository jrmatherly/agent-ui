'use client'

import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminMetrics } from '@/hooks/useAdminMetrics'
import {
  Users,
  UserCheck,
  Bot,
  MessageSquare,
  Clock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: string | number
  description?: string
  icon?: React.ElementType
  variant?: 'default' | 'success' | 'warning' | 'danger'
  isLoading?: boolean
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  variant = 'default',
  isLoading
}: MetricCardProps) {
  const variantStyles = {
    default: 'border-border',
    success: 'border-l-4 border-l-positive',
    warning: 'border-l-4 border-l-amber-500',
    danger: 'border-l-4 border-l-destructive'
  }

  if (isLoading) {
    return (
      <Card className="p-5">
        <Skeleton className="mb-2 h-4 w-24" />
        <Skeleton className="mb-2 h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'group relative overflow-hidden p-5 transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-lg',
        variantStyles[variant]
      )}
    >
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            {label}
          </p>
          <p className="text-3xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
          {description && (
            <p className="text-muted-foreground/70 text-xs">{description}</p>
          )}
        </div>
        {Icon && (
          <div className="bg-accent/50 text-muted-foreground group-hover:bg-accent group-hover:text-foreground rounded-lg p-2.5 transition-colors">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  )
}

export function AdminMetrics() {
  const { data: metrics, isLoading, error, isRefetching } = useAdminMetrics()
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['adminMetrics'] })
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-destructive h-5 w-5" />
          <div>
            <p className="font-medium">Failed to load metrics</p>
            <p className="text-muted-foreground text-sm">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="ml-auto"
          >
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            System Overview
          </h3>
          <p className="text-muted-foreground text-sm">
            Real-time metrics for your organization
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefetching}
          className="text-muted-foreground"
        >
          <RefreshCw
            className={cn('mr-2 h-4 w-4', isRefetching && 'animate-spin')}
          />
          Refresh
        </Button>
      </div>

      {/* User Metrics */}
      <div className="space-y-3">
        <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          User Activity
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            label="Total Users"
            value={metrics?.totalUsers ?? 0}
            description="Registered users"
            icon={Users}
            isLoading={isLoading}
          />
          <MetricCard
            label="Active Users"
            value={metrics?.activeUsers ?? 0}
            description="Active in last 24h"
            icon={UserCheck}
            variant={metrics && metrics.activeUsers > 0 ? 'success' : 'default'}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* System Metrics */}
      <div className="space-y-3">
        <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          System Performance
        </h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Agents"
            value={metrics?.totalAgents ?? 0}
            description="Configured agents"
            icon={Bot}
            isLoading={isLoading}
          />
          <MetricCard
            label="Total Sessions"
            value={metrics?.totalSessions ?? 0}
            description="All time"
            icon={MessageSquare}
            isLoading={isLoading}
          />
          <MetricCard
            label="Avg Session Duration"
            value={metrics?.avgSessionDuration ?? 'N/A'}
            description="Last 7 days"
            icon={Clock}
            isLoading={isLoading}
          />
          <MetricCard
            label="Error Rate"
            value={metrics?.errorRate ?? 'N/A'}
            description="Last 24h"
            icon={AlertTriangle}
            variant={
              metrics?.errorRate && parseFloat(metrics.errorRate) > 5
                ? 'danger'
                : 'default'
            }
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
