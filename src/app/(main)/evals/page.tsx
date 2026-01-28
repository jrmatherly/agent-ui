'use client'

import { useState } from 'react'
import { useEvals } from '@/hooks/useEvals'
import { AccuracyChart } from '@/components/evals/AccuracyChart'
import { PerformanceMetrics } from '@/components/evals/PerformanceMetrics'
import { ReliabilityTable } from '@/components/evals/ReliabilityTable'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { EvalRun } from '@/types/os'

export default function EvalsPage() {
  const { evalRuns, isLoading, error } = useEvals()
  const [selectedRun, setSelectedRun] = useState<EvalRun | null>(null)

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
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

  // Build accuracy trend data from eval runs
  const accuracyData = evalRuns.map((run) => ({
    date: new Date(run.created_at * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }),
    accuracy: run.metrics.accuracy
  }))

  const latestRun = evalRuns[0]

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-foreground mb-6 text-2xl font-semibold">
        Evaluations
      </h1>

      {evalRuns.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          No evaluation runs yet. Run evaluations against your agents to see
          quality metrics.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metrics overview */}
          {latestRun && <PerformanceMetrics metrics={latestRun.metrics} />}

          {/* Accuracy trend */}
          <AccuracyChart
            data={accuracyData}
            currentAccuracy={latestRun?.metrics.accuracy}
          />

          {/* Run selection */}
          <div>
            <h2 className="text-foreground mb-3 text-sm font-medium uppercase">
              Evaluation Runs
            </h2>
            <div className="flex flex-wrap gap-2">
              {evalRuns.map((run) => (
                <button
                  key={run.run_id}
                  onClick={() => setSelectedRun(run)}
                  className={cn(
                    'border-border hover:bg-accent rounded-lg border px-3 py-2 text-sm transition-colors',
                    selectedRun?.run_id === run.run_id &&
                      'bg-accent border-primary/20'
                  )}
                >
                  <span className="font-medium">{run.eval_set_name}</span>
                  <span className="text-muted-foreground ml-2">
                    {new Date(run.created_at * 1000).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Results table */}
          {selectedRun && (
            <div>
              <h2 className="text-foreground mb-3 text-sm font-medium uppercase">
                Results: {selectedRun.eval_set_name}
              </h2>
              <ReliabilityTable results={selectedRun.results} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
