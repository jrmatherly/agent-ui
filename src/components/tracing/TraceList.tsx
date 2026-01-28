'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Trace } from '@/types/os'

interface TraceListProps {
  traces: Trace[]
  onSelectTrace: (trace: Trace) => void
  selectedTraceId?: string
}

export function TraceList({
  traces,
  onSelectTrace,
  selectedTraceId
}: TraceListProps) {
  const statusColors = {
    ok: 'bg-green-500/10 text-green-600 dark:text-green-400',
    error: 'bg-red-500/10 text-red-600 dark:text-red-400',
    unset: 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (traces.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        No traces found
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {traces.map((trace) => (
        <button
          key={trace.trace_id}
          onClick={() => onSelectTrace(trace)}
          className={cn(
            'border-border hover:bg-accent flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors',
            selectedTraceId === trace.trace_id && 'bg-accent border-primary/20'
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm">{trace.trace_id}</p>
            <p className="text-muted-foreground text-xs">
              {formatTime(trace.start_time)} · {trace.duration_ms}ms
              {trace.total_tokens && ` · ${trace.total_tokens} tokens`}
            </p>
          </div>
          <Badge className={cn('ml-2 shrink-0', statusColors[trace.status])}>
            {trace.status}
          </Badge>
        </button>
      ))}
    </div>
  )
}
