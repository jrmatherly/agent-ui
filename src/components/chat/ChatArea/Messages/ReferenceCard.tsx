'use client'

import { FileText } from 'lucide-react'
import type { Reference } from '@/types/os'

interface ReferenceCardProps {
  reference: Reference
  maxLength?: number
}

export function ReferenceCard({
  reference,
  maxLength = 200
}: ReferenceCardProps) {
  const truncatedContent =
    reference.content.length > maxLength
      ? reference.content.slice(0, maxLength) + '...'
      : reference.content

  return (
    <div className="bg-secondary/50 border-border flex gap-3 rounded-lg border p-3">
      <div className="shrink-0">
        <FileText className="text-muted-foreground h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-medium">
          {reference.name}
        </p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {truncatedContent}
        </p>
        <p className="text-muted-foreground/70 mt-2 text-xs">
          Chunk {reference.meta_data.chunk} · {reference.meta_data.chunk_size}{' '}
          chars
        </p>
      </div>
    </div>
  )
}
