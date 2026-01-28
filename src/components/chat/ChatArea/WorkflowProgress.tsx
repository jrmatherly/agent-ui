'use client'

import { cn } from '@/lib/utils'
import { Check, Loader2, Circle, AlertCircle, ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent
} from '@/components/ui/collapsible'
import { useState } from 'react'
import type { WorkflowStep } from '@/types/os'

interface WorkflowProgressProps {
  steps: WorkflowStep[]
  className?: string
}

const STATUS_STYLES = {
  pending: {
    border: 'border-muted-foreground/30',
    bg: '',
    icon: Circle,
    iconClass: 'text-muted-foreground/50'
  },
  running: {
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    icon: Loader2,
    iconClass: 'text-blue-500 animate-spin'
  },
  completed: {
    border: 'border-emerald-500',
    bg: 'bg-emerald-500/10',
    icon: Check,
    iconClass: 'text-emerald-500'
  },
  failed: {
    border: 'border-red-500',
    bg: 'bg-red-500/10',
    icon: AlertCircle,
    iconClass: 'text-red-500'
  },
  skipped: {
    border: 'border-muted-foreground/30',
    bg: 'bg-muted/30',
    icon: Circle,
    iconClass: 'text-muted-foreground/30'
  }
}

export function WorkflowProgress({ steps, className }: WorkflowProgressProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  const formatDuration = (ms?: number): string => {
    if (!ms) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getStepDuration = (step: WorkflowStep): number | undefined => {
    if (step.started_at && step.completed_at) {
      return (step.completed_at - step.started_at) * 1000
    }
    return undefined
  }

  return (
    <div className={cn('space-y-1', className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1
        const statusStyle = STATUS_STYLES[step.status]
        const StatusIcon = statusStyle.icon
        const duration = getStepDuration(step)
        const isExpanded = expandedSteps.has(step.step_id)
        const hasOutput = step.output_preview || step.error_message

        return (
          <div key={step.step_id} className="relative">
            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'absolute top-8 left-4 -ml-px h-6 w-0.5',
                  step.status === 'completed' ? 'bg-emerald-500' : 'bg-border'
                )}
              />
            )}

            <Collapsible
              open={isExpanded}
              onOpenChange={() => hasOutput && toggleStep(step.step_id)}
            >
              <CollapsibleTrigger
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg p-2 transition-colors',
                  hasOutput && 'hover:bg-muted/50 cursor-pointer'
                )}
                disabled={!hasOutput}
              >
                {/* Status indicator */}
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
                    statusStyle.border,
                    statusStyle.bg
                  )}
                >
                  <StatusIcon
                    className={cn('h-4 w-4', statusStyle.iconClass)}
                  />
                </div>

                {/* Step info */}
                <div className="flex flex-1 items-center gap-2 text-left">
                  <span className="font-medium">{step.name}</span>
                  {step.index !== undefined && (
                    <span className="text-muted-foreground text-xs">
                      #{step.index + 1}
                    </span>
                  )}
                </div>

                {/* Duration */}
                {duration && (
                  <span className="text-muted-foreground font-mono text-xs">
                    {formatDuration(duration)}
                  </span>
                )}

                {/* Expand indicator */}
                {hasOutput && (
                  <ChevronDown
                    className={cn(
                      'text-muted-foreground h-4 w-4 transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />
                )}
              </CollapsibleTrigger>

              {hasOutput && (
                <CollapsibleContent>
                  <div className="bg-muted/30 text-muted-foreground mt-1 ml-11 rounded-lg p-3 text-sm">
                    {step.error_message ? (
                      <div className="text-red-500">
                        <span className="font-medium">Error: </span>
                        {step.error_message}
                      </div>
                    ) : step.output_preview ? (
                      <div className="wrap-break-word whitespace-pre-wrap">
                        {step.output_preview.length > 300
                          ? step.output_preview.slice(0, 300) + '...'
                          : step.output_preview}
                      </div>
                    ) : null}
                  </div>
                </CollapsibleContent>
              )}
            </Collapsible>
          </div>
        )
      })}
    </div>
  )
}
