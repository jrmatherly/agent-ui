import { cn } from '@/lib/utils'

interface TokenBadgeProps {
  tokens: number
  className?: string
}

export function TokenBadge({ tokens, className }: TokenBadgeProps) {
  const formatted =
    tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : tokens.toString()

  return (
    <span
      className={cn(
        'text-muted-foreground bg-accent rounded px-1.5 py-0.5 text-[10px] font-medium',
        className
      )}
    >
      {formatted} tokens
    </span>
  )
}
