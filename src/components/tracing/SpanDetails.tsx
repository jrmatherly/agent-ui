'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Span } from '@/types/os'

interface SpanDetailsProps {
  span: Span
}

export function SpanDetails({ span }: SpanDetailsProps) {
  const statusColors = {
    ok: 'bg-green-500/10 text-green-600 dark:text-green-400',
    error: 'bg-red-500/10 text-red-600 dark:text-red-400',
    unset: 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
  }

  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-mono text-sm font-medium">{span.name}</h4>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {span.duration_ms}ms
          </span>
          <Badge className={cn('text-xs', statusColors[span.status])}>
            {span.status}
          </Badge>
        </div>
      </div>

      {span.error_message && (
        <div className="mb-3 rounded-md bg-red-500/10 p-2 text-sm text-red-600 dark:text-red-400">
          {span.error_message}
        </div>
      )}

      {Object.keys(span.attributes).length > 0 && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs uppercase">Attributes</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(span.attributes).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="text-muted-foreground">{key}:</span>{' '}
                <span className="font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
