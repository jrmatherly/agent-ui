'use client'

import { ArrowRight, CheckCircle, Loader2, XCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { TeamDelegation } from '@/types/os'

interface TeamDelegationFlowProps {
  delegations: TeamDelegation[]
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-500/10'
  },
  in_progress: {
    icon: Loader2,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    animate: true
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10'
  }
}

export function TeamDelegationFlow({ delegations }: TeamDelegationFlowProps) {
  if (delegations.length === 0) return null

  return (
    <div className="border-border mt-3 space-y-2 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs font-medium uppercase">
        Team Delegation
      </p>
      {delegations.map((delegation) => {
        const config = statusConfig[delegation.status]
        const StatusIcon = config.icon

        return (
          <div
            key={delegation.delegation_id}
            className="bg-secondary/50 flex items-center gap-3 rounded-md p-2"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                {delegation.from_agent}
              </span>
              <ArrowRight className="text-muted-foreground h-3 w-3" />
              <span className="text-xs font-medium">{delegation.to_agent}</span>
            </div>

            <span className="text-muted-foreground flex-1 truncate text-xs">
              {delegation.task}
            </span>

            <Badge className={cn('gap-1 text-xs', config.bg, config.color)}>
              <StatusIcon
                className={cn(
                  'h-3 w-3',
                  'animate' in config && config.animate && 'animate-spin'
                )}
              />
              {delegation.status}
            </Badge>
          </div>
        )
      })}
    </div>
  )
}
