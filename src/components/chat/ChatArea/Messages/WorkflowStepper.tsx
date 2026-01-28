'use client'

import {
  CheckCircle,
  Loader2,
  Circle,
  XCircle,
  SkipForward
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowStep } from '@/types/os'

interface WorkflowStepperProps {
  steps: WorkflowStep[]
  currentStepIndex?: number
}

const statusConfig = {
  pending: {
    icon: Circle,
    iconClass: 'text-muted-foreground',
    bgClass: 'bg-secondary',
    lineClass: 'bg-border'
  },
  running: {
    icon: Loader2,
    iconClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-500/10 ring-2 ring-blue-500/20',
    lineClass: 'bg-blue-500/30',
    animate: true
  },
  completed: {
    icon: CheckCircle,
    iconClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-500/10',
    lineClass: 'bg-green-500/50'
  },
  failed: {
    icon: XCircle,
    iconClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-500/10',
    lineClass: 'bg-red-500/50'
  },
  skipped: {
    icon: SkipForward,
    iconClass: 'text-muted-foreground',
    bgClass: 'bg-secondary',
    lineClass: 'bg-border'
  }
}

export function WorkflowStepper({
  steps,
  currentStepIndex: _currentStepIndex
}: WorkflowStepperProps) {
  if (steps.length === 0) return null

  return (
    <div className="border-border mt-3 rounded-lg border p-3">
      <p className="text-muted-foreground mb-3 text-xs font-medium uppercase">
        Workflow Progress
      </p>
      <div className="relative">
        {steps.map((step, index) => {
          const config = statusConfig[step.status]
          const StatusIcon = config.icon
          const isLast = index === steps.length - 1

          return (
            <div
              key={step.step_id}
              className="relative flex gap-3 pb-4 last:pb-0"
            >
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute top-8 left-[15px] h-full w-0.5',
                    config.lineClass
                  )}
                />
              )}

              {/* Step indicator */}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                  config.bgClass
                )}
              >
                {step.status === 'completed' ||
                step.status === 'failed' ||
                step.status === 'skipped' ? (
                  <StatusIcon className={cn('h-4 w-4', config.iconClass)} />
                ) : step.status === 'running' ? (
                  <StatusIcon
                    className={cn('h-4 w-4 animate-spin', config.iconClass)}
                  />
                ) : (
                  <span className="text-muted-foreground">{index + 1}</span>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 pt-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.status === 'running' &&
                      'text-blue-600 dark:text-blue-400',
                    step.status === 'completed' &&
                      'text-green-600 dark:text-green-400',
                    step.status === 'pending' && 'text-muted-foreground'
                  )}
                >
                  {step.name}
                </p>
                {step.output_preview && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {step.output_preview}
                  </p>
                )}
                {step.error_message && (
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                    {step.error_message}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
