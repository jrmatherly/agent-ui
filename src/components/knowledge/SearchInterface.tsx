'use client'

import { useState } from 'react'
import { Search, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { KnowledgeSearchResult } from '@/types/os'

interface SearchInterfaceProps {
  onSearch: (query: string) => Promise<void>
  results: KnowledgeSearchResult[]
  isSearching?: boolean
}

export function SearchInterface({
  onSearch,
  results,
  isSearching = false
}: SearchInterfaceProps) {
  const [query, setQuery] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      await onSearch(query.trim())
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isSearching || !query.trim()}>
          Search
        </Button>
      </form>

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
          {results.map((result) => (
            <Card key={result.chunk_id}>
              <CardContent className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="text-muted-foreground h-4 w-4" />
                    <span className="font-medium">{result.document_name}</span>
                  </div>
                  <span className="text-muted-foreground font-mono text-sm">
                    {Math.round(result.score * 100)}%
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-3 text-sm">
                  {result.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results.length === 0 && query && !isSearching && (
        <p className="text-muted-foreground py-4 text-center text-sm">
          No results found for &quot;{query}&quot;
        </p>
      )}
    </div>
  )
}
