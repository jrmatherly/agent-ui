'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { ReferenceCard } from './ReferenceCard'
import type { Reference } from '@/types/os'

interface ReferenceListProps {
  references: Reference[]
  query?: string
}

export function ReferenceList({ references, query }: ReferenceListProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (references.length === 0) return null

  const sourceText =
    references.length === 1 ? '1 source' : `${references.length} sources`

  return (
    <div className="mt-3">
      {query && (
        <p className="text-muted-foreground mb-1 truncate text-xs">
          Query: {query}
        </p>
      )}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs transition-colors"
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span>{sourceText}</span>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {references.map((ref, index) => (
            <ReferenceCard key={`${ref.name}-${index}`} reference={ref} />
          ))}
        </div>
      )}
    </div>
  )
}
