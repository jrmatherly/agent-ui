'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import {
  MessageSquarePlus,
  Database,
  Settings,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickActionProps {
  href: string
  icon: React.ElementType
  label: string
  description: string
  variant?: 'primary' | 'secondary'
}

function QuickActionCard({
  href,
  icon: Icon,
  label,
  description,
  variant = 'secondary'
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-4 rounded-lg border p-4 transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md',
        variant === 'primary'
          ? 'border-brand/20 bg-brand/5 hover:border-brand/40'
          : 'hover:bg-accent/50'
      )}
    >
      <div
        className={cn(
          'rounded-lg p-2.5 transition-colors',
          variant === 'primary'
            ? 'bg-brand/10 text-brand group-hover:bg-brand/20'
            : 'bg-accent text-muted-foreground group-hover:text-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground truncate text-sm">{description}</p>
      </div>
      <ArrowRight className="text-muted-foreground h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

export function QuickActions() {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="text-brand h-4 w-4" />
        <h3 className="font-semibold">Quick Actions</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <QuickActionCard
          href="/chat"
          icon={MessageSquarePlus}
          label="New Chat"
          description="Start a conversation with an agent"
          variant="primary"
        />
        <QuickActionCard
          href="/knowledge"
          icon={Database}
          label="Knowledge Base"
          description="Manage documents and data sources"
        />
        <QuickActionCard
          href="/profile"
          icon={Settings}
          label="Settings"
          description="Configure your preferences"
        />
      </div>
    </Card>
  )
}
