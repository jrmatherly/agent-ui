'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { KnowledgeChunk } from '@/types/os'

interface ChunkViewerProps {
  chunks: KnowledgeChunk[]
  documentName: string
}

const embeddingStatusColors = {
  pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  processing: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400'
}

export function ChunkViewer({ chunks, documentName }: ChunkViewerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{documentName}</h2>
        <span className="text-muted-foreground text-sm">
          {chunks.length} chunk{chunks.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {chunks.map((chunk) => (
          <Card key={chunk.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  Chunk {chunk.chunk_index + 1}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-mono text-xs">
                    {chunk.start_char}-{chunk.end_char}
                  </span>
                  <Badge
                    className={cn(
                      'text-xs',
                      embeddingStatusColors[chunk.embedding_status]
                    )}
                  >
                    {chunk.embedding_status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {chunk.content}
              </p>
              {Object.keys(chunk.metadata).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {Object.entries(chunk.metadata).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="text-xs">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
