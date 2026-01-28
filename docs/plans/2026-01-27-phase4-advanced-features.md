# Phase 4: Advanced Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement four advanced features from Agno parity analysis: Knowledge explorer UI, Team delegation visualization, Workflow step progress indicator, and Structured output rendering.

**Architecture:** Knowledge explorer builds on existing service layer and API routes. Team delegation and workflow progress integrate into chat via streaming events. Structured output rendering enhances message display with smart JSON/table rendering.

**Tech Stack:** TypeScript, React 19, Zustand 5, Tailwind CSS v4, shadcn/ui components, existing KnowledgeService

---

## Task 1: Add Knowledge Document Types

**Files:**

- Modify: `src/types/os.ts`

**Step 1: Write the failing test**

```bash
mkdir -p src/types/__tests__
touch src/types/__tests__/knowledge.test.ts
```

```typescript
// src/types/__tests__/knowledge.test.ts
import { describe, it, expect } from 'vitest'
import type { KnowledgeDocument, KnowledgeChunk, KnowledgeSearchResult } from '../os'

describe('Knowledge types', () => {
  it('should define KnowledgeDocument interface', () => {
    const doc: KnowledgeDocument = {
      id: 'doc-123',
      name: 'company-policy.pdf',
      content_type: 'application/pdf',
      size_bytes: 102400,
      status: 'processed',
      chunk_count: 15,
      created_at: 1706400000,
      updated_at: 1706400000
    }
    expect(doc.id).toBe('doc-123')
    expect(doc.status).toBe('processed')
  })

  it('should define KnowledgeChunk interface', () => {
    const chunk: KnowledgeChunk = {
      id: 'chunk-456',
      document_id: 'doc-123',
      content: 'This is the chunk content...',
      chunk_index: 3,
      start_char: 1024,
      end_char: 1536,
      embedding_status: 'completed',
      metadata: { page: 2 }
    }
    expect(chunk.chunk_index).toBe(3)
  })

  it('should define KnowledgeSearchResult interface', () => {
    const result: KnowledgeSearchResult = {
      document_id: 'doc-123',
      document_name: 'policy.pdf',
      chunk_id: 'chunk-456',
      content: 'Matching content...',
      score: 0.92,
      metadata: {}
    }
    expect(result.score).toBe(0.92)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/types/__tests__/knowledge.test.ts`
Expected: FAIL - KnowledgeDocument, KnowledgeChunk, KnowledgeSearchResult not defined

**Step 3: Write minimal implementation**

Add to `src/types/os.ts`:

```typescript
export interface KnowledgeDocument {
  id: string
  name: string
  content_type: string
  size_bytes: number
  status: 'pending' | 'processing' | 'processed' | 'failed'
  chunk_count: number
  created_at: number
  updated_at: number
  error_message?: string
}

export interface KnowledgeChunk {
  id: string
  document_id: string
  content: string
  chunk_index: number
  start_char: number
  end_char: number
  embedding_status: 'pending' | 'processing' | 'completed' | 'failed'
  metadata: Record<string, unknown>
}

export interface KnowledgeSearchResult {
  document_id: string
  document_name: string
  chunk_id: string
  content: string
  score: number
  metadata: Record<string, unknown>
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/types/__tests__/knowledge.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/os.ts src/types/__tests__/knowledge.test.ts
git commit -m "feat(types): add KnowledgeDocument, KnowledgeChunk, KnowledgeSearchResult types"
```

---

## Task 2: Add Team Delegation and Workflow Types

**Files:**

- Modify: `src/types/os.ts`

**Step 1: Write the failing test**

```bash
touch src/types/__tests__/delegation.test.ts
```

```typescript
// src/types/__tests__/delegation.test.ts
import { describe, it, expect } from 'vitest'
import { RunEvent } from '../os'
import type { TeamDelegation, WorkflowStep } from '../os'

describe('Team delegation types', () => {
  it('should have team delegation events', () => {
    expect(RunEvent.TeamDelegationStarted).toBe('TeamDelegationStarted')
    expect(RunEvent.TeamDelegationCompleted).toBe('TeamDelegationCompleted')
  })

  it('should define TeamDelegation interface', () => {
    const delegation: TeamDelegation = {
      delegation_id: 'del-123',
      from_agent: 'Leader',
      to_agent: 'Researcher',
      task: 'Find market data',
      status: 'in_progress',
      started_at: 1706400000
    }
    expect(delegation.from_agent).toBe('Leader')
    expect(delegation.status).toBe('in_progress')
  })
})

describe('Workflow step types', () => {
  it('should have workflow step events', () => {
    expect(RunEvent.WorkflowStepStarted).toBe('WorkflowStepStarted')
    expect(RunEvent.WorkflowStepCompleted).toBe('WorkflowStepCompleted')
  })

  it('should define WorkflowStep interface', () => {
    const step: WorkflowStep = {
      step_id: 'step-123',
      name: 'Research',
      index: 0,
      status: 'completed',
      started_at: 1706400000,
      completed_at: 1706400030,
      output_preview: 'Found 15 relevant sources...'
    }
    expect(step.index).toBe(0)
    expect(step.status).toBe('completed')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/types/__tests__/delegation.test.ts`
Expected: FAIL - TeamDelegation, WorkflowStep, delegation events not defined

**Step 3: Write minimal implementation**

Add to RunEvent enum in `src/types/os.ts`:

```typescript
  // Team Delegation Events
  TeamDelegationStarted = 'TeamDelegationStarted',
  TeamDelegationCompleted = 'TeamDelegationCompleted',
```

Add interfaces:

```typescript
export interface TeamDelegation {
  delegation_id: string
  from_agent: string
  to_agent: string
  task: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  started_at: number
  completed_at?: number
  result?: string
}

export interface WorkflowStep {
  step_id: string
  name: string
  index: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  started_at?: number
  completed_at?: number
  output_preview?: string
  error_message?: string
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/types/__tests__/delegation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/os.ts src/types/__tests__/delegation.test.ts
git commit -m "feat(types): add TeamDelegation and WorkflowStep types with events"
```

---

## Task 3: Create useKnowledgeDocuments Hook

**Files:**

- Create: `src/hooks/useKnowledgeDocuments.ts`

**Step 1: Write the failing test**

```bash
touch src/hooks/__tests__/useKnowledgeDocuments.test.ts
```

```typescript
// src/hooks/__tests__/useKnowledgeDocuments.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useKnowledgeDocuments } from '../useKnowledgeDocuments'

vi.mock('@/store', () => ({
  useStore: vi.fn((selector) => {
    const state = {
      selectedEndpoint: 'http://localhost:8000',
      authToken: 'test-token'
    }
    return selector ? selector(state) : state
  })
}))

global.fetch = vi.fn()

describe('useKnowledgeDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        documents: [
          {
            id: 'doc-1',
            name: 'policy.pdf',
            content_type: 'application/pdf',
            size_bytes: 1024,
            status: 'processed',
            chunk_count: 5,
            created_at: 1706400000,
            updated_at: 1706400000
          }
        ]
      })
    })
  })

  it('should fetch documents', async () => {
    const { result } = renderHook(() => useKnowledgeDocuments())

    await waitFor(() => {
      expect(result.current.documents).toHaveLength(1)
    })

    expect(result.current.documents[0].name).toBe('policy.pdf')
  })

  it('should provide upload function', () => {
    const { result } = renderHook(() => useKnowledgeDocuments())
    expect(typeof result.current.uploadDocument).toBe('function')
  })

  it('should provide delete function', () => {
    const { result } = renderHook(() => useKnowledgeDocuments())
    expect(typeof result.current.deleteDocument).toBe('function')
  })

  it('should provide search function', () => {
    const { result } = renderHook(() => useKnowledgeDocuments())
    expect(typeof result.current.searchDocuments).toBe('function')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/hooks/__tests__/useKnowledgeDocuments.test.ts`
Expected: FAIL - useKnowledgeDocuments not found

**Step 3: Write minimal implementation**

```typescript
// src/hooks/useKnowledgeDocuments.ts
import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'
import type { KnowledgeDocument, KnowledgeSearchResult } from '@/types/os'

export function useKnowledgeDocuments() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {}
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
    return headers
  }, [authToken])

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const response = await fetch(APIRoutes.KnowledgeUpload(endpointUrl), {
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }

      const data = await response.json()
      setDocuments(data.documents ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [selectedEndpoint, getHeaders])

  const uploadDocument = useCallback(
    async (file: File) => {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(APIRoutes.KnowledgeUpload(endpointUrl), {
        method: 'POST',
        headers: getHeaders(),
        body: formData
      })

      if (response.ok) {
        await fetchDocuments()
      }

      return response.ok
    },
    [selectedEndpoint, getHeaders, fetchDocuments]
  )

  const deleteDocument = useCallback(
    async (documentId: string) => {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const response = await fetch(
        APIRoutes.KnowledgeContent(endpointUrl, documentId),
        {
          method: 'DELETE',
          headers: getHeaders()
        }
      )

      if (response.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== documentId))
      }

      return response.ok
    },
    [selectedEndpoint, getHeaders]
  )

  const searchDocuments = useCallback(
    async (query: string): Promise<KnowledgeSearchResult[]> => {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const response = await fetch(APIRoutes.KnowledgeSearch(endpointUrl), {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      })

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      return data.results ?? []
    },
    [selectedEndpoint, getHeaders]
  )

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return {
    documents,
    isLoading,
    error,
    refetch: fetchDocuments,
    uploadDocument,
    deleteDocument,
    searchDocuments
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/hooks/__tests__/useKnowledgeDocuments.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useKnowledgeDocuments.ts src/hooks/__tests__/useKnowledgeDocuments.test.ts
git commit -m "feat(hooks): add useKnowledgeDocuments hook for KB management"
```

---

## Task 4: Create DocumentCard Component

**Files:**

- Create: `src/components/knowledge/DocumentCard.tsx`

**Step 1: Write the failing test**

```bash
mkdir -p src/components/knowledge/__tests__
touch src/components/knowledge/__tests__/DocumentCard.test.tsx
```

```typescript
// src/components/knowledge/__tests__/DocumentCard.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentCard } from '../DocumentCard'

describe('DocumentCard', () => {
  const mockDoc = {
    id: 'doc-123',
    name: 'company-policy.pdf',
    content_type: 'application/pdf',
    size_bytes: 102400,
    status: 'processed' as const,
    chunk_count: 15,
    created_at: 1706400000,
    updated_at: 1706400000
  }

  it('should render document name', () => {
    render(<DocumentCard document={mockDoc} onDelete={vi.fn()} onViewChunks={vi.fn()} />)
    expect(screen.getByText('company-policy.pdf')).toBeInTheDocument()
  })

  it('should render file size', () => {
    render(<DocumentCard document={mockDoc} onDelete={vi.fn()} onViewChunks={vi.fn()} />)
    expect(screen.getByText('100 KB')).toBeInTheDocument()
  })

  it('should render chunk count', () => {
    render(<DocumentCard document={mockDoc} onDelete={vi.fn()} onViewChunks={vi.fn()} />)
    expect(screen.getByText('15 chunks')).toBeInTheDocument()
  })

  it('should render status badge', () => {
    render(<DocumentCard document={mockDoc} onDelete={vi.fn()} onViewChunks={vi.fn()} />)
    expect(screen.getByText('processed')).toBeInTheDocument()
  })

  it('should call onDelete when delete clicked', () => {
    const onDelete = vi.fn()
    render(<DocumentCard document={mockDoc} onDelete={onDelete} onViewChunks={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('Delete document'))
    expect(onDelete).toHaveBeenCalledWith('doc-123')
  })

  it('should call onViewChunks when view clicked', () => {
    const onViewChunks = vi.fn()
    render(<DocumentCard document={mockDoc} onDelete={vi.fn()} onViewChunks={onViewChunks} />)
    fireEvent.click(screen.getByText('View Chunks'))
    expect(onViewChunks).toHaveBeenCalledWith('doc-123')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/knowledge/__tests__/DocumentCard.test.tsx`
Expected: FAIL - DocumentCard not found

**Step 3: Write minimal implementation**

```typescript
// src/components/knowledge/DocumentCard.tsx
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

export function DocumentCard({ document, onDelete, onViewChunks }: DocumentCardProps) {
  const isProcessing = document.status === 'pending' || document.status === 'processing'

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
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/knowledge/__tests__/DocumentCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/knowledge/DocumentCard.tsx src/components/knowledge/__tests__/DocumentCard.test.tsx
git commit -m "feat(knowledge): add DocumentCard component"
```

---

## Task 5: Create DocumentUploader Component

**Files:**

- Create: `src/components/knowledge/DocumentUploader.tsx`

**Step 1: Write the failing test**

```bash
touch src/components/knowledge/__tests__/DocumentUploader.test.tsx
```

```typescript
// src/components/knowledge/__tests__/DocumentUploader.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DocumentUploader } from '../DocumentUploader'

describe('DocumentUploader', () => {
  it('should render upload area', () => {
    render(<DocumentUploader onUpload={vi.fn()} />)
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
  })

  it('should render file input', () => {
    render(<DocumentUploader onUpload={vi.fn()} />)
    expect(screen.getByLabelText(/upload/i)).toBeInTheDocument()
  })

  it('should show uploading state', () => {
    render(<DocumentUploader onUpload={vi.fn()} isUploading={true} />)
    expect(screen.getByText(/uploading/i)).toBeInTheDocument()
  })

  it('should accept supported file types', () => {
    render(<DocumentUploader onUpload={vi.fn()} />)
    const input = screen.getByLabelText(/upload/i)
    expect(input).toHaveAttribute('accept', '.pdf,.txt,.md,.docx')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/knowledge/__tests__/DocumentUploader.test.tsx`
Expected: FAIL - DocumentUploader not found

**Step 3: Write minimal implementation**

```typescript
// src/components/knowledge/DocumentUploader.tsx
'use client'

import { useCallback, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentUploaderProps {
  onUpload: (file: File) => Promise<void>
  isUploading?: boolean
}

export function DocumentUploader({ onUpload, isUploading = false }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        await onUpload(file)
      }
    },
    [onUpload]
  )

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        await onUpload(file)
        e.target.value = ''
      }
    },
    [onUpload]
  )

  return (
    <label
      className={cn(
        'border-border hover:border-primary/50 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
        isDragging && 'border-primary bg-primary/5',
        isUploading && 'pointer-events-none opacity-50'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isUploading ? (
        <>
          <Loader2 className="text-muted-foreground mb-2 h-8 w-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Uploading...</p>
        </>
      ) : (
        <>
          <Upload className="text-muted-foreground mb-2 h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            Drag and drop a file, or click to browse
          </p>
          <p className="text-muted-foreground/70 mt-1 text-xs">
            Supports PDF, TXT, MD, DOCX
          </p>
        </>
      )}
      <input
        type="file"
        className="sr-only"
        accept=".pdf,.txt,.md,.docx"
        onChange={handleFileChange}
        disabled={isUploading}
        aria-label="Upload document"
      />
    </label>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/knowledge/__tests__/DocumentUploader.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/knowledge/DocumentUploader.tsx src/components/knowledge/__tests__/DocumentUploader.test.tsx
git commit -m "feat(knowledge): add DocumentUploader component with drag-drop"
```

---

## Task 6: Create SearchInterface Component

**Files:**

- Create: `src/components/knowledge/SearchInterface.tsx`

**Step 1: Write the failing test**

```bash
touch src/components/knowledge/__tests__/SearchInterface.test.tsx
```

```typescript
// src/components/knowledge/__tests__/SearchInterface.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchInterface } from '../SearchInterface'

describe('SearchInterface', () => {
  it('should render search input', () => {
    render(<SearchInterface onSearch={vi.fn()} results={[]} />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })

  it('should call onSearch when submitted', () => {
    const onSearch = vi.fn()
    render(<SearchInterface onSearch={onSearch} results={[]} />)

    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.change(input, { target: { value: 'test query' } })
    fireEvent.submit(input.closest('form')!)

    expect(onSearch).toHaveBeenCalledWith('test query')
  })

  it('should render results', () => {
    const results = [
      {
        document_id: 'doc-1',
        document_name: 'policy.pdf',
        chunk_id: 'chunk-1',
        content: 'Matching content here',
        score: 0.92,
        metadata: {}
      }
    ]
    render(<SearchInterface onSearch={vi.fn()} results={results} />)
    expect(screen.getByText('policy.pdf')).toBeInTheDocument()
    expect(screen.getByText(/Matching content/)).toBeInTheDocument()
  })

  it('should show score percentage', () => {
    const results = [
      {
        document_id: 'doc-1',
        document_name: 'policy.pdf',
        chunk_id: 'chunk-1',
        content: 'Content',
        score: 0.92,
        metadata: {}
      }
    ]
    render(<SearchInterface onSearch={vi.fn()} results={results} />)
    expect(screen.getByText('92%')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/knowledge/__tests__/SearchInterface.test.tsx`
Expected: FAIL - SearchInterface not found

**Step 3: Write minimal implementation**

```typescript
// src/components/knowledge/SearchInterface.tsx
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
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
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
                  <span className="text-muted-foreground text-sm font-mono">
                    {Math.round(result.score * 100)}%
                  </span>
                </div>
                <p className="text-muted-foreground text-sm line-clamp-3">
                  {result.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results.length === 0 && query && !isSearching && (
        <p className="text-muted-foreground py-4 text-center text-sm">
          No results found for "{query}"
        </p>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/knowledge/__tests__/SearchInterface.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/knowledge/SearchInterface.tsx src/components/knowledge/__tests__/SearchInterface.test.tsx
git commit -m "feat(knowledge): add SearchInterface component"
```

---

## Task 7: Create ChunkViewer Component

**Files:**

- Create: `src/components/knowledge/ChunkViewer.tsx`

**Step 1: Write the failing test**

```bash
touch src/components/knowledge/__tests__/ChunkViewer.test.tsx
```

```typescript
// src/components/knowledge/__tests__/ChunkViewer.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChunkViewer } from '../ChunkViewer'

describe('ChunkViewer', () => {
  const mockChunks = [
    {
      id: 'chunk-1',
      document_id: 'doc-1',
      content: 'First chunk content',
      chunk_index: 0,
      start_char: 0,
      end_char: 512,
      embedding_status: 'completed' as const,
      metadata: { page: 1 }
    },
    {
      id: 'chunk-2',
      document_id: 'doc-1',
      content: 'Second chunk content',
      chunk_index: 1,
      start_char: 512,
      end_char: 1024,
      embedding_status: 'completed' as const,
      metadata: { page: 1 }
    }
  ]

  it('should render all chunks', () => {
    render(<ChunkViewer chunks={mockChunks} documentName="policy.pdf" />)
    expect(screen.getByText('First chunk content')).toBeInTheDocument()
    expect(screen.getByText('Second chunk content')).toBeInTheDocument()
  })

  it('should render document name', () => {
    render(<ChunkViewer chunks={mockChunks} documentName="policy.pdf" />)
    expect(screen.getByText('policy.pdf')).toBeInTheDocument()
  })

  it('should render chunk indices', () => {
    render(<ChunkViewer chunks={mockChunks} documentName="policy.pdf" />)
    expect(screen.getByText('Chunk 1')).toBeInTheDocument()
    expect(screen.getByText('Chunk 2')).toBeInTheDocument()
  })

  it('should render character ranges', () => {
    render(<ChunkViewer chunks={mockChunks} documentName="policy.pdf" />)
    expect(screen.getByText(/0-512/)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/knowledge/__tests__/ChunkViewer.test.tsx`
Expected: FAIL - ChunkViewer not found

**Step 3: Write minimal implementation**

```typescript
// src/components/knowledge/ChunkViewer.tsx
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
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/knowledge/__tests__/ChunkViewer.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/knowledge/ChunkViewer.tsx src/components/knowledge/__tests__/ChunkViewer.test.tsx
git commit -m "feat(knowledge): add ChunkViewer component"
```

---

## Task 8: Create Knowledge Explorer Page

**Files:**

- Create: `src/app/(main)/knowledge/page.tsx`

**Step 1: Write the failing test**

```bash
mkdir -p src/app/\(main\)/knowledge/__tests__
touch src/app/\(main\)/knowledge/__tests__/page.test.tsx
```

```typescript
// src/app/(main)/knowledge/__tests__/page.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import KnowledgePage from '../page'

vi.mock('@/hooks/useKnowledgeDocuments', () => ({
  useKnowledgeDocuments: () => ({
    documents: [],
    isLoading: false,
    error: null,
    uploadDocument: vi.fn(),
    deleteDocument: vi.fn(),
    searchDocuments: vi.fn()
  })
}))

describe('KnowledgePage', () => {
  it('should render page title', () => {
    render(<KnowledgePage />)
    expect(screen.getByText('Knowledge Base')).toBeInTheDocument()
  })

  it('should render upload section', () => {
    render(<KnowledgePage />)
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
  })

  it('should render search section', () => {
    render(<KnowledgePage />)
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/app/\(main\)/knowledge/__tests__/page.test.tsx`
Expected: FAIL - page.tsx not found

**Step 3: Write minimal implementation**

```typescript
// src/app/(main)/knowledge/page.tsx
'use client'

import { useState } from 'react'
import { useKnowledgeDocuments } from '@/hooks/useKnowledgeDocuments'
import { DocumentCard } from '@/components/knowledge/DocumentCard'
import { DocumentUploader } from '@/components/knowledge/DocumentUploader'
import { SearchInterface } from '@/components/knowledge/SearchInterface'
import { ChunkViewer } from '@/components/knowledge/ChunkViewer'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { KnowledgeSearchResult, KnowledgeChunk } from '@/types/os'

export default function KnowledgePage() {
  const {
    documents,
    isLoading,
    error,
    uploadDocument,
    deleteDocument,
    searchDocuments
  } = useKnowledgeDocuments()

  const [isUploading, setIsUploading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<KnowledgeSearchResult[]>([])
  const [selectedDocumentChunks, setSelectedDocumentChunks] = useState<{
    name: string
    chunks: KnowledgeChunk[]
  } | null>(null)

  const handleUpload = async (file: File) => {
    setIsUploading(true)
    try {
      await uploadDocument(file)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSearch = async (query: string) => {
    setIsSearching(true)
    try {
      const results = await searchDocuments(query)
      setSearchResults(results)
    } finally {
      setIsSearching(false)
    }
  }

  const handleViewChunks = async (documentId: string) => {
    // TODO: Fetch chunks for document
    // For now, placeholder
    const doc = documents.find((d) => d.id === documentId)
    if (doc) {
      setSelectedDocumentChunks({
        name: doc.name,
        chunks: []
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-destructive rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-foreground mb-6 text-2xl font-semibold">
        Knowledge Base
      </h1>

      <Tabs defaultValue="documents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          {selectedDocumentChunks && (
            <TabsTrigger value="chunks">Chunks</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          <DocumentUploader onUpload={handleUpload} isUploading={isUploading} />

          {documents.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No documents uploaded yet. Upload your first document to get
              started.
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onDelete={deleteDocument}
                  onViewChunks={handleViewChunks}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="search">
          <SearchInterface
            onSearch={handleSearch}
            results={searchResults}
            isSearching={isSearching}
          />
        </TabsContent>

        {selectedDocumentChunks && (
          <TabsContent value="chunks">
            <ChunkViewer
              chunks={selectedDocumentChunks.chunks}
              documentName={selectedDocumentChunks.name}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/app/\(main\)/knowledge/__tests__/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/\(main\)/knowledge/page.tsx src/app/\(main\)/knowledge/__tests__/page.test.tsx
git commit -m "feat(knowledge): add Knowledge Explorer page"
```

---

## Task 9: Create TeamDelegationFlow Component

**Files:**

- Create: `src/components/chat/ChatArea/Messages/TeamDelegationFlow.tsx`

**Step 1: Write the failing test**

```bash
touch src/components/chat/ChatArea/Messages/__tests__/TeamDelegationFlow.test.tsx
```

```typescript
// src/components/chat/ChatArea/Messages/__tests__/TeamDelegationFlow.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeamDelegationFlow } from '../TeamDelegationFlow'

describe('TeamDelegationFlow', () => {
  const mockDelegations = [
    {
      delegation_id: 'del-1',
      from_agent: 'Leader',
      to_agent: 'Researcher',
      task: 'Find market data',
      status: 'completed' as const,
      started_at: 1706400000,
      completed_at: 1706400030
    },
    {
      delegation_id: 'del-2',
      from_agent: 'Leader',
      to_agent: 'Writer',
      task: 'Draft report',
      status: 'in_progress' as const,
      started_at: 1706400030
    }
  ]

  it('should render all delegations', () => {
    render(<TeamDelegationFlow delegations={mockDelegations} />)
    expect(screen.getByText('Researcher')).toBeInTheDocument()
    expect(screen.getByText('Writer')).toBeInTheDocument()
  })

  it('should show task descriptions', () => {
    render(<TeamDelegationFlow delegations={mockDelegations} />)
    expect(screen.getByText('Find market data')).toBeInTheDocument()
    expect(screen.getByText('Draft report')).toBeInTheDocument()
  })

  it('should show status indicators', () => {
    render(<TeamDelegationFlow delegations={mockDelegations} />)
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('in_progress')).toBeInTheDocument()
  })

  it('should show from agent', () => {
    render(<TeamDelegationFlow delegations={mockDelegations} />)
    expect(screen.getAllByText('Leader')).toHaveLength(2)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/chat/ChatArea/Messages/__tests__/TeamDelegationFlow.test.tsx`
Expected: FAIL - TeamDelegationFlow not found

**Step 3: Write minimal implementation**

```typescript
// src/components/chat/ChatArea/Messages/TeamDelegationFlow.tsx
'use client'

import { ArrowRight, CheckCircle, Loader2, XCircle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { TeamDelegation } from '@/types/os'

interface TeamDelegationFlowProps {
  delegations: TeamDelegation[]
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-500/10'
  },
  in_progress: {
    icon: Loader2,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    animate: true
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-500/10'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10'
  }
}

export function TeamDelegationFlow({ delegations }: TeamDelegationFlowProps) {
  if (delegations.length === 0) return null

  return (
    <div className="border-border mt-3 space-y-2 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs font-medium uppercase">
        Team Delegation
      </p>
      {delegations.map((delegation) => {
        const config = statusConfig[delegation.status]
        const StatusIcon = config.icon

        return (
          <div
            key={delegation.delegation_id}
            className="bg-secondary/50 flex items-center gap-3 rounded-md p-2"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground text-xs font-medium">
                {delegation.from_agent}
              </span>
              <ArrowRight className="text-muted-foreground h-3 w-3" />
              <span className="text-xs font-medium">{delegation.to_agent}</span>
            </div>

            <span className="text-muted-foreground flex-1 truncate text-xs">
              {delegation.task}
            </span>

            <Badge className={cn('gap-1 text-xs', config.bg, config.color)}>
              <StatusIcon
                className={cn('h-3 w-3', config.animate && 'animate-spin')}
              />
              {delegation.status}
            </Badge>
          </div>
        )
      })}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/chat/ChatArea/Messages/__tests__/TeamDelegationFlow.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/ChatArea/Messages/TeamDelegationFlow.tsx src/components/chat/ChatArea/Messages/__tests__/TeamDelegationFlow.test.tsx
git commit -m "feat(chat): add TeamDelegationFlow component"
```

---

## Task 10: Create WorkflowStepper Component

**Files:**

- Create: `src/components/chat/ChatArea/Messages/WorkflowStepper.tsx`

**Step 1: Write the failing test**

```bash
touch src/components/chat/ChatArea/Messages/__tests__/WorkflowStepper.test.tsx
```

```typescript
// src/components/chat/ChatArea/Messages/__tests__/WorkflowStepper.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WorkflowStepper } from '../WorkflowStepper'

describe('WorkflowStepper', () => {
  const mockSteps = [
    {
      step_id: 'step-1',
      name: 'Research',
      index: 0,
      status: 'completed' as const,
      started_at: 1706400000,
      completed_at: 1706400030,
      output_preview: 'Found 15 sources'
    },
    {
      step_id: 'step-2',
      name: 'Analysis',
      index: 1,
      status: 'running' as const,
      started_at: 1706400030
    },
    {
      step_id: 'step-3',
      name: 'Report',
      index: 2,
      status: 'pending' as const
    }
  ]

  it('should render all steps', () => {
    render(<WorkflowStepper steps={mockSteps} />)
    expect(screen.getByText('Research')).toBeInTheDocument()
    expect(screen.getByText('Analysis')).toBeInTheDocument()
    expect(screen.getByText('Report')).toBeInTheDocument()
  })

  it('should show step numbers', () => {
    render(<WorkflowStepper steps={mockSteps} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should show output preview for completed steps', () => {
    render(<WorkflowStepper steps={mockSteps} />)
    expect(screen.getByText('Found 15 sources')).toBeInTheDocument()
  })

  it('should indicate current step', () => {
    render(<WorkflowStepper steps={mockSteps} currentStepIndex={1} />)
    // Analysis is the current step
    expect(screen.getByText('Analysis')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/chat/ChatArea/Messages/__tests__/WorkflowStepper.test.tsx`
Expected: FAIL - WorkflowStepper not found

**Step 3: Write minimal implementation**

```typescript
// src/components/chat/ChatArea/Messages/WorkflowStepper.tsx
'use client'

import { CheckCircle, Loader2, Circle, XCircle, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WorkflowStep } from '@/types/os'

interface WorkflowStepperProps {
  steps: WorkflowStep[]
  currentStepIndex?: number
}

const statusConfig = {
  pending: {
    icon: Circle,
    iconClass: 'text-muted-foreground',
    bgClass: 'bg-secondary',
    lineClass: 'bg-border'
  },
  running: {
    icon: Loader2,
    iconClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-500/10 ring-2 ring-blue-500/20',
    lineClass: 'bg-blue-500/30',
    animate: true
  },
  completed: {
    icon: CheckCircle,
    iconClass: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-500/10',
    lineClass: 'bg-green-500/50'
  },
  failed: {
    icon: XCircle,
    iconClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-500/10',
    lineClass: 'bg-red-500/50'
  },
  skipped: {
    icon: SkipForward,
    iconClass: 'text-muted-foreground',
    bgClass: 'bg-secondary',
    lineClass: 'bg-border'
  }
}

export function WorkflowStepper({ steps, currentStepIndex }: WorkflowStepperProps) {
  if (steps.length === 0) return null

  return (
    <div className="border-border mt-3 rounded-lg border p-3">
      <p className="text-muted-foreground mb-3 text-xs font-medium uppercase">
        Workflow Progress
      </p>
      <div className="relative">
        {steps.map((step, index) => {
          const config = statusConfig[step.status]
          const StatusIcon = config.icon
          const isLast = index === steps.length - 1

          return (
            <div key={step.step_id} className="relative flex gap-3 pb-4 last:pb-0">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-[15px] top-8 h-full w-0.5',
                    config.lineClass
                  )}
                />
              )}

              {/* Step indicator */}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium',
                  config.bgClass
                )}
              >
                {step.status === 'completed' || step.status === 'failed' || step.status === 'skipped' ? (
                  <StatusIcon className={cn('h-4 w-4', config.iconClass)} />
                ) : step.status === 'running' ? (
                  <StatusIcon
                    className={cn('h-4 w-4 animate-spin', config.iconClass)}
                  />
                ) : (
                  <span className="text-muted-foreground">{index + 1}</span>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 pt-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.status === 'running' && 'text-blue-600 dark:text-blue-400',
                    step.status === 'completed' && 'text-green-600 dark:text-green-400',
                    step.status === 'pending' && 'text-muted-foreground'
                  )}
                >
                  {step.name}
                </p>
                {step.output_preview && (
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {step.output_preview}
                  </p>
                )}
                {step.error_message && (
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                    {step.error_message}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/chat/ChatArea/Messages/__tests__/WorkflowStepper.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/ChatArea/Messages/WorkflowStepper.tsx src/components/chat/ChatArea/Messages/__tests__/WorkflowStepper.test.tsx
git commit -m "feat(chat): add WorkflowStepper component"
```

---

## Task 11: Create StructuredOutput Component

**Files:**

- Create: `src/components/chat/ChatArea/Messages/StructuredOutput.tsx`

**Step 1: Write the failing test**

```bash
touch src/components/chat/ChatArea/Messages/__tests__/StructuredOutput.test.tsx
```

```typescript
// src/components/chat/ChatArea/Messages/__tests__/StructuredOutput.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StructuredOutput } from '../StructuredOutput'

describe('StructuredOutput', () => {
  it('should render array data as table', () => {
    const data = [
      { name: 'Alice', age: 30, role: 'Developer' },
      { name: 'Bob', age: 25, role: 'Designer' }
    ]
    render(<StructuredOutput data={data} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('should render object data as key-value pairs', () => {
    const data = {
      name: 'Product X',
      price: 99.99,
      inStock: true
    }
    render(<StructuredOutput data={data} />)
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('Product X')).toBeInTheDocument()
    expect(screen.getByText('price')).toBeInTheDocument()
  })

  it('should render nested objects as collapsible JSON', () => {
    const data = {
      user: {
        name: 'Alice',
        address: {
          city: 'NYC'
        }
      }
    }
    render(<StructuredOutput data={data} />)
    expect(screen.getByText(/user/)).toBeInTheDocument()
  })

  it('should handle primitive values', () => {
    render(<StructuredOutput data="Simple string" />)
    expect(screen.getByText('Simple string')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/chat/ChatArea/Messages/__tests__/StructuredOutput.test.tsx`
Expected: FAIL - StructuredOutput not found

**Step 3: Write minimal implementation**

```typescript
// src/components/chat/ChatArea/Messages/StructuredOutput.tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StructuredOutputProps {
  data: unknown
}

function isArrayOfObjects(data: unknown): data is Record<string, unknown>[] {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    typeof data[0] === 'object' &&
    data[0] !== null
  )
}

function isSimpleObject(data: unknown): data is Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false
  }
  // Check if all values are primitives
  return Object.values(data).every(
    (v) => typeof v !== 'object' || v === null
  )
}

function JsonTree({ data, depth = 0 }: { data: unknown; depth?: number }) {
  const [isExpanded, setIsExpanded] = useState(depth < 2)

  if (typeof data !== 'object' || data === null) {
    return (
      <span
        className={cn(
          'font-mono text-sm',
          typeof data === 'string' && 'text-green-600 dark:text-green-400',
          typeof data === 'number' && 'text-blue-600 dark:text-blue-400',
          typeof data === 'boolean' && 'text-amber-600 dark:text-amber-400'
        )}
      >
        {JSON.stringify(data)}
      </span>
    )
  }

  const entries = Object.entries(data)
  const isArray = Array.isArray(data)

  return (
    <div className="font-mono text-sm">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="hover:bg-accent -ml-4 rounded px-1"
      >
        {isExpanded ? (
          <ChevronDown className="inline h-3 w-3" />
        ) : (
          <ChevronRight className="inline h-3 w-3" />
        )}
        <span className="text-muted-foreground ml-1">
          {isArray ? `[${entries.length}]` : `{${entries.length}}`}
        </span>
      </button>
      {isExpanded && (
        <div className="ml-4 border-l border-dashed border-gray-300 pl-3 dark:border-gray-600">
          {entries.map(([key, value]) => (
            <div key={key} className="py-0.5">
              <span className="text-purple-600 dark:text-purple-400">
                {isArray ? '' : `${key}: `}
              </span>
              <JsonTree data={value} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function StructuredOutput({ data }: StructuredOutputProps) {
  // Primitive values
  if (typeof data !== 'object' || data === null) {
    return <p className="text-sm">{String(data)}</p>
  }

  // Array of objects -> Table
  if (isArrayOfObjects(data)) {
    const keys = Object.keys(data[0])
    return (
      <Table>
        <TableHeader>
          <TableRow>
            {keys.map((key) => (
              <TableHead key={key} className="capitalize">
                {key}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow key={idx}>
              {keys.map((key) => (
                <TableCell key={key}>{String(row[key] ?? '')}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  // Simple flat object -> Card with key-value pairs
  if (isSimpleObject(data)) {
    return (
      <Card>
        <CardContent className="grid grid-cols-2 gap-2 p-4">
          {Object.entries(data).map(([key, value]) => (
            <div key={key}>
              <p className="text-muted-foreground text-xs">{key}</p>
              <p className="font-medium">{String(value)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Complex nested object -> JSON tree
  return (
    <div className="bg-secondary/50 rounded-lg p-3">
      <JsonTree data={data} />
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/chat/ChatArea/Messages/__tests__/StructuredOutput.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/ChatArea/Messages/StructuredOutput.tsx src/components/chat/ChatArea/Messages/__tests__/StructuredOutput.test.tsx
git commit -m "feat(chat): add StructuredOutput component for smart JSON rendering"
```

---

## Task 12: Add Delegation State to Store

**Files:**

- Modify: `src/store.ts`

**Step 1: Write the failing test**

Add to existing store tests:

```typescript
// Add to src/__tests__/store.test.ts
import type { TeamDelegation, WorkflowStep } from '@/types/os'

describe('Store delegation state', () => {
  it('should store team delegations', () => {
    const delegations: TeamDelegation[] = [{
      delegation_id: 'del-1',
      from_agent: 'Leader',
      to_agent: 'Worker',
      task: 'Do task',
      status: 'in_progress',
      started_at: 123
    }]
    useStore.getState().setTeamDelegations(delegations)
    expect(useStore.getState().teamDelegations).toEqual(delegations)
  })

  it('should store workflow steps', () => {
    const steps: WorkflowStep[] = [{
      step_id: 'step-1',
      name: 'Research',
      index: 0,
      status: 'completed'
    }]
    useStore.getState().setWorkflowSteps(steps)
    expect(useStore.getState().workflowSteps).toEqual(steps)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/store.test.ts`
Expected: FAIL - setTeamDelegations, setWorkflowSteps not defined

**Step 3: Write minimal implementation**

Add to store interface and implementation in `src/store.ts`:

```typescript
import type { TeamDelegation, WorkflowStep } from '@/types/os'

interface Store {
  // ... existing properties ...
  teamDelegations: TeamDelegation[]
  setTeamDelegations: (delegations: TeamDelegation[]) => void
  workflowSteps: WorkflowStep[]
  setWorkflowSteps: (steps: WorkflowStep[]) => void
}

// In create():
    teamDelegations: [],
    setTeamDelegations: (delegations) => set({ teamDelegations: delegations }),
    workflowSteps: [],
    setWorkflowSteps: (steps) => set({ workflowSteps: steps }),
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/__tests__/store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/store.ts src/__tests__/store.test.ts
git commit -m "feat(store): add teamDelegations and workflowSteps state"
```

---

## Task 13: Add Delegation and Workflow Handlers to Stream

**Files:**

- Modify: `src/hooks/useAIStreamHandler.tsx`

**Step 1: Add event handlers**

In `useAIStreamHandler.tsx`, add to the onChunk handler:

```typescript
// Add imports
import type { TeamDelegation, WorkflowStep } from '@/types/os'

// Add store selectors
const setTeamDelegations = useStore((state) => state.setTeamDelegations)
const setWorkflowSteps = useStore((state) => state.setWorkflowSteps)
const teamDelegations = useStore((state) => state.teamDelegations)
const workflowSteps = useStore((state) => state.workflowSteps)

// Add in onChunk handler
} else if (chunk.event === RunEvent.TeamDelegationStarted) {
  const delegation: TeamDelegation = {
    delegation_id: chunk.event_data?.delegation_id ?? '',
    from_agent: chunk.event_data?.from_agent ?? '',
    to_agent: chunk.event_data?.to_agent ?? '',
    task: chunk.event_data?.task ?? '',
    status: 'in_progress',
    started_at: chunk.created_at ?? Date.now() / 1000
  }
  setTeamDelegations([...teamDelegations, delegation])
} else if (chunk.event === RunEvent.TeamDelegationCompleted) {
  setTeamDelegations(
    teamDelegations.map((d) =>
      d.delegation_id === chunk.event_data?.delegation_id
        ? { ...d, status: 'completed', completed_at: chunk.created_at }
        : d
    )
  )
} else if (chunk.event === RunEvent.WorkflowStepStarted) {
  const step: WorkflowStep = {
    step_id: chunk.event_data?.step_id ?? '',
    name: chunk.event_data?.step_name ?? '',
    index: chunk.event_data?.step_index ?? 0,
    status: 'running',
    started_at: chunk.created_at
  }
  setWorkflowSteps([...workflowSteps, step])
} else if (chunk.event === RunEvent.WorkflowStepCompleted) {
  setWorkflowSteps(
    workflowSteps.map((s) =>
      s.step_id === chunk.event_data?.step_id
        ? {
            ...s,
            status: 'completed',
            completed_at: chunk.created_at,
            output_preview: chunk.event_data?.output_preview
          }
        : s
    )
  )
}
```

Add these to dependency array: `setTeamDelegations`, `setWorkflowSteps`, `teamDelegations`, `workflowSteps`

**Step 2: Run validation**

Run: `pnpm validate`
Expected: PASS

**Step 3: Commit**

```bash
git add src/hooks/useAIStreamHandler.tsx
git commit -m "feat(stream): handle TeamDelegation and WorkflowStep events"
```

---

## Task 14: Integrate Delegation and Workflow in MessageItem

**Files:**

- Modify: `src/components/chat/ChatArea/Messages/MessageItem.tsx`

**Step 1: Add imports**

```typescript
import { TeamDelegationFlow } from './TeamDelegationFlow'
import { WorkflowStepper } from './WorkflowStepper'
import { StructuredOutput } from './StructuredOutput'
import { useStore } from '@/store'
```

**Step 2: Add to AgentMessage component**

```typescript
const AgentMessage = ({ message }: MessageProps) => {
  const { streamingErrorMessage } = useStore()
  const teamDelegations = useStore((state) => state.teamDelegations)
  const workflowSteps = useStore((state) => state.workflowSteps)
  const mode = useStore((state) => state.mode)

  // Check if content is structured JSON
  const isStructuredOutput = message.content &&
    message.content.startsWith('{') &&
    message.content.endsWith('}')

  let parsedContent: unknown = null
  if (isStructuredOutput) {
    try {
      parsedContent = JSON.parse(message.content)
    } catch {
      parsedContent = null
    }
  }

  // ... existing messageContent logic ...

  // After messageContent in the return:
  return (
    <div className="font-geist flex flex-row items-start gap-4">
      <div className="shrink-0">
        <Icon type="agent" size="sm" />
      </div>
      <div className="flex-1">
        {parsedContent ? (
          <StructuredOutput data={parsedContent} />
        ) : (
          messageContent
        )}

        {/* Team delegation flow */}
        {mode === 'team' && teamDelegations.length > 0 && (
          <TeamDelegationFlow delegations={teamDelegations} />
        )}

        {/* Workflow steps - shown when steps are available */}
        {workflowSteps.length > 0 && (
          <WorkflowStepper steps={workflowSteps} />
        )}
      </div>
    </div>
  )
}
```

**Step 3: Run validation**

Run: `pnpm validate`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/chat/ChatArea/Messages/MessageItem.tsx
git commit -m "feat(chat): integrate TeamDelegationFlow, WorkflowStepper, StructuredOutput in messages"
```

---

## Task 15: Final Validation

**Files:**

- All new files

**Step 1: Run full validation**

Run: `pnpm validate`
Expected: PASS (lint + format + typecheck)

**Step 2: Run all tests**

Run: `pnpm test`
Expected: All tests pass

**Step 3: Verify all exports**

Check that `src/types/os.ts` exports:

- `KnowledgeDocument`, `KnowledgeChunk`, `KnowledgeSearchResult`
- `TeamDelegation`, `WorkflowStep`
- New RunEvent values: `TeamDelegationStarted`, `TeamDelegationCompleted`, `WorkflowStepStarted`, `WorkflowStepCompleted`

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 4 advanced features implementation

- Add Knowledge Explorer with document upload, search, and chunk viewer
- Add Team Delegation Flow visualization in chat
- Add Workflow Stepper for step-by-step progress
- Add Structured Output rendering (tables, cards, JSON trees)
- Extend store with delegation and workflow state
- Handle delegation and workflow events in stream handler"
```

---

## Summary

| Task | Component | Status |
|------|-----------|--------|
| 1-2 | Types (Knowledge, Delegation, Workflow) | Pending |
| 3 | useKnowledgeDocuments Hook | Pending |
| 4-7 | Knowledge Components (Card, Uploader, Search, Chunks) | Pending |
| 8 | Knowledge Explorer Page | Pending |
| 9 | TeamDelegationFlow Component | Pending |
| 10 | WorkflowStepper Component | Pending |
| 11 | StructuredOutput Component | Pending |
| 12 | Store Extensions | Pending |
| 13 | Stream Handler Updates | Pending |
| 14 | MessageItem Integration | Pending |
| 15 | Final Validation | Pending |

**Total estimated tasks:** 15
**Each task follows TDD:** Test → Fail → Implement → Pass → Commit
