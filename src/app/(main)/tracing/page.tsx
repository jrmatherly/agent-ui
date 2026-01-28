'use client'

import { useState } from 'react'
import { useTraces } from '@/hooks/useTraces'
import { TraceList } from '@/components/tracing/TraceList'
import { TreeView } from '@/components/tracing/TreeView'
import { WaterfallView } from '@/components/tracing/WaterfallView'
import { SpanDetails } from '@/components/tracing/SpanDetails'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Trace, Span } from '@/types/os'

type ViewMode = 'tree' | 'waterfall'

export default function TracingPage() {
  const { traces, isLoading, error } = useTraces()
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null)
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('tree')

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-destructive rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-foreground mb-6 text-2xl font-semibold">Tracing</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trace list */}
        <div className="lg:col-span-1">
          <h2 className="text-foreground mb-3 text-sm font-medium uppercase">
            Recent Traces
          </h2>
          <TraceList
            traces={traces}
            onSelectTrace={(trace) => {
              setSelectedTrace(trace)
              setSelectedSpan(null)
            }}
            selectedTraceId={selectedTrace?.trace_id}
          />
        </div>

        {/* Span view */}
        <div className="lg:col-span-2">
          {selectedTrace ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-foreground text-sm font-medium uppercase">
                  Spans
                </h2>
                <div className="bg-secondary flex rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('tree')}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      viewMode === 'tree'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Tree
                  </button>
                  <button
                    onClick={() => setViewMode('waterfall')}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      viewMode === 'waterfall'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Waterfall
                  </button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="border-border rounded-lg border p-4">
                  {viewMode === 'tree' ? (
                    <TreeView
                      spans={selectedTrace.spans}
                      onSelectSpan={setSelectedSpan}
                      selectedSpanId={selectedSpan?.span_id}
                    />
                  ) : (
                    <WaterfallView
                      spans={selectedTrace.spans}
                      totalDuration={selectedTrace.duration_ms}
                      onSelectSpan={setSelectedSpan}
                      selectedSpanId={selectedSpan?.span_id}
                    />
                  )}
                </div>

                <div>
                  {selectedSpan ? (
                    <SpanDetails span={selectedSpan} />
                  ) : (
                    <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                      Select a span to view details
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
              Select a trace to view spans
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
