'use client'

import { FileText, Trash2, Eye, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { KnowledgeDocument } from '@/types/os'

interface DocumentCardProps {
  document: KnowledgeDocument
  onDelete: (id: string) => void
  onViewChunks: (id: string) => void
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round(bytes / Math.pow(k, i))} ${sizes[i]}`
}

const statusColors = {
  pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  processing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  processed: 'bg-green-500/10 text-green-600 dark:text-green-400',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400'
}

export function DocumentCard({
  document,
  onDelete,
  onViewChunks
}: DocumentCardProps) {
  const isProcessing =
    document.status === 'pending' || document.status === 'processing'

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="bg-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          {isProcessing ? (
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          ) : (
            <FileText className="text-muted-foreground h-5 w-5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{document.name}</p>
          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
            <span>{formatBytes(document.size_bytes)}</span>
            <span>·</span>
            <span>{document.chunk_count} chunks</span>
          </div>
        </div>

        <Badge className={cn('shrink-0', statusColors[document.status])}>
          {document.status}
        </Badge>

        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewChunks(document.id)}
            disabled={isProcessing}
          >
            <Eye className="mr-1 h-3.5 w-3.5" />
            View Chunks
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(document.id)}
            aria-label="Delete document"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
