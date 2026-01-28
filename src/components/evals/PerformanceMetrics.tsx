'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Clock, Target } from 'lucide-react'
import type { EvalMetrics } from '@/types/os'

interface PerformanceMetricsProps {
  metrics: EvalMetrics
}

export function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  const stats = [
    {
      label: 'Accuracy',
      value: `${Math.round(metrics.accuracy * 100)}%`,
      icon: Target,
      color: 'text-green-600'
    },
    {
      label: 'Avg Latency',
      value: `${metrics.avg_latency_ms}ms`,
      icon: Clock,
      color: 'text-blue-600'
    },
    {
      label: 'Passed',
      value: String(metrics.passed_count),
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      label: 'Failed',
      value: String(metrics.failed_count),
      icon: XCircle,
      color: 'text-red-600'
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {stat.label}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
      <Card className="col-span-2 md:col-span-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total_runs}</div>
        </CardContent>
      </Card>
    </div>
  )
}
