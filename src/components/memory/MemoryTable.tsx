'use client'

import { useState } from 'react'
import { useMemories } from '@/hooks/useMemories'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Trash2 } from 'lucide-react'
import type { MemoryEntry } from '@/types/os'

interface MemoryTableProps {
  memories?: MemoryEntry[]
  isLoading?: boolean
  error?: string | null
}

export function MemoryTable({
  memories: externalMemories,
  isLoading: externalLoading,
  error: externalError
}: MemoryTableProps = {}) {
  const hook = useMemories()
  const memories = externalMemories ?? hook.memories
  const isLoading = externalLoading ?? hook.isLoading
  const error = externalError ?? hook.error
  const { deleteMemory } = hook

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (memoryId: string) => {
    setDeletingId(memoryId)
    await deleteMemory(memoryId)
    setDeletingId(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-destructive rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        {error}
      </div>
    )
  }

  if (memories.length === 0) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        No memories stored yet. Memories will appear here as agents learn from
        conversations.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40%]">Memory</TableHead>
          <TableHead>Topics</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {memories.map((memory) => (
          <TableRow key={memory.memory_id}>
            <TableCell className="font-medium">{memory.memory}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {memory.topics.map((topic) => (
                  <Badge key={topic} variant="secondary">
                    {topic}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatDate(memory.created_at)}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(memory.memory_id)}
                disabled={deletingId === memory.memory_id}
                aria-label="Delete memory"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
