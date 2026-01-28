'use client'

import { cn } from '@/lib/utils'
import { Wifi, WifiOff, AlertCircle, Loader2 } from 'lucide-react'

type StatusType = 'online' | 'offline' | 'error' | 'pending'

interface StatusBadgeProps {
  status: StatusType
  label?: string
  showPulse?: boolean
  size?: 'sm' | 'md'
}

const statusConfig = {
  online: {
    icon: Wifi,
    label: 'Connected',
    bgClass: 'bg-positive/10 dark:bg-positive/15',
    textClass: 'text-positive',
    dotClass: 'bg-positive'
  },
  offline: {
    icon: WifiOff,
    label: 'Offline',
    bgClass: 'bg-amber-500/10 dark:bg-amber-500/15',
    textClass: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500'
  },
  error: {
    icon: AlertCircle,
    label: 'Error',
    bgClass: 'bg-destructive/10 dark:bg-destructive/15',
    textClass: 'text-destructive',
    dotClass: 'bg-destructive'
  },
  pending: {
    icon: Loader2,
    label: 'Connecting',
    bgClass: 'bg-blue-500/10 dark:bg-blue-500/15',
    textClass: 'text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-500'
  }
}

export function StatusBadge({
  status,
  label,
  showPulse = true,
  size = 'md'
}: StatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon
  const displayLabel = label || config.label

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-3 py-1 text-xs gap-2'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5'
  }

  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2'
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        sizeClasses[size],
        config.bgClass,
        config.textClass
      )}
      role="status"
      aria-label={displayLabel}
    >
      <Icon
        className={cn(iconSizes[size], status === 'pending' && 'animate-spin')}
      />
      <span
        className={cn(
          'rounded-full',
          dotSizes[size],
          config.dotClass,
          showPulse && status === 'online' && 'animate-pulse'
        )}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </div>
  )
}
