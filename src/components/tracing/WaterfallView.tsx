'use client'

import { cn } from '@/lib/utils'
import type { Span } from '@/types/os'

interface WaterfallViewProps {
  spans: Span[]
  totalDuration: number
  onSelectSpan: (span: Span) => void
  selectedSpanId?: string
}

export function WaterfallView({
  spans,
  totalDuration,
  onSelectSpan,
  selectedSpanId
}: WaterfallViewProps) {
  const minTime = Math.min(...spans.map((s) => s.start_time))

  const statusColors = {
    ok: 'bg-green-500',
    error: 'bg-red-500',
    unset: 'bg-gray-400'
  }

  return (
    <div className="space-y-1">
      {spans.map((span) => {
        const startOffset =
          ((span.start_time - minTime) / (totalDuration * 1000)) * 100
        const width = (span.duration_ms / totalDuration) * 100

        return (
          <button
            key={span.span_id}
            onClick={() => onSelectSpan(span)}
            className={cn(
              'hover:bg-accent/50 flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors',
              selectedSpanId === span.span_id && 'bg-accent'
            )}
          >
            <span className="w-24 shrink-0 truncate font-mono text-xs">
              {span.name}
            </span>
            <div className="bg-secondary relative h-4 flex-1 rounded-full">
              <div
                className={cn(
                  'absolute h-full rounded-full',
                  statusColors[span.status]
                )}
                style={{
                  left: `${startOffset}%`,
                  width: `${Math.max(width, 1)}%`
                }}
              />
            </div>
            <span className="text-muted-foreground w-16 shrink-0 text-right text-xs">
              {span.duration_ms}ms
            </span>
          </button>
        )
      })}
    </div>
  )
}
