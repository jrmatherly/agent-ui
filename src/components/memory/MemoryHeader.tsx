'use client'

import { Button } from '@/components/ui/button'
import { Plus, RefreshCw } from 'lucide-react'

interface MemoryHeaderProps {
  onCreateClick: () => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export function MemoryHeader({
  onCreateClick,
  onRefresh,
  isRefreshing
}: MemoryHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold">Memory Management</h1>
        <p className="text-muted-foreground text-sm">
          View and manage agent memories stored from conversations
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh memories"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </Button>
        <Button onClick={onCreateClick} className="bg-brand gap-2 text-white">
          <Plus className="h-4 w-4" />
          Add Memory
        </Button>
      </div>
    </div>
  )
}
