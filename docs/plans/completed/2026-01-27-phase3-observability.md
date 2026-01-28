# Phase 3: Observability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement three observability features from Agno parity analysis: Tracing dashboard with tree/waterfall views, Reference/context display in chat messages, and Evals dashboard for quality monitoring.

**Architecture:** Tracing and Evals are standalone pages with dedicated hooks and components. Reference display integrates into existing MessageItem. All use established patterns: types → API routes → hooks → UI components.

**Tech Stack:** TypeScript, React 19, Zustand 5, Tailwind CSS v4, shadcn/ui components, Recharts for visualizations

---

## Task 1: Add Tracing Types

**Files:**

- Modify: `src/types/os.ts`

**Step 1: Write the failing test**

```bash
mkdir -p src/types/__tests__
touch src/types/__tests__/tracing.test.ts
```

```typescript
// src/types/__tests__/tracing.test.ts
import { describe, it, expect } from 'vitest'
import type { Trace, Span, TraceListResponse } from '../os'

describe('Tracing types', () => {
  it('should define Span interface', () => {
    const span: Span = {
      span_id: 'span-123',
      parent_span_id: null,
      name: 'llm_call',
      start_time: 1706400000000,
      end_time: 1706400001500,
      duration_ms: 1500,
      status: 'ok',
      attributes: {
        model: 'gpt-4',
        tokens_input: 150,
        tokens_output: 200
      }
    }
    expect(span.span_id).toBe('span-123')
    expect(span.duration_ms).toBe(1500)
  })

  it('should define Trace interface', () => {
    const trace: Trace = {
      trace_id: 'trace-456',
      session_id: 'sess-789',
      run_id: 'run-101',
      agent_id: 'agent-102',
      start_time: 1706400000000,
      end_time: 1706400005000,
      duration_ms: 5000,
      status: 'ok',
      spans: [],
      total_tokens: 350,
      total_cost: 0.0035
    }
    expect(trace.trace_id).toBe('trace-456')
    expect(trace.total_tokens).toBe(350)
  })

  it('should define TraceListResponse interface', () => {
    const response: TraceListResponse = {
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total_count: 0,
        total_pages: 0
      }
    }
    expect(response.data).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/types/__tests__/tracing.test.ts`
Expected: FAIL - Span, Trace, TraceListResponse not defined

**Step 3: Write minimal implementation**

Add to `src/types/os.ts`:

```typescript
export interface Span {
  span_id: string
  parent_span_id: string | null
  name: string
  start_time: number
  end_time: number
  duration_ms: number
  status: 'ok' | 'error' | 'unset'
  attributes: Record<string, unknown>
  error_message?: string
}

export interface Trace {
  trace_id: string
  session_id: string
  run_id: string
  agent_id?: string
  team_id?: string
  start_time: number
  end_time: number
  duration_ms: number
  status: 'ok' | 'error' | 'unset'
  spans: Span[]
  total_tokens?: number
  total_cost?: number
}

export interface TraceListResponse {
  data: Trace[]
  meta: Pagination
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/types/__tests__/tracing.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/os.ts src/types/__tests__/tracing.test.ts
git commit -m "feat(types): add Trace, Span, and TraceListResponse types"
```

---

## Task 2: Add Eval Types

**Files:**

- Modify: `src/types/os.ts`

**Step 1: Write the failing test**

```bash
touch src/types/__tests__/evals.test.ts
```

```typescript
// src/types/__tests__/evals.test.ts
import { describe, it, expect } from 'vitest'
import type { EvalResult, EvalRun, EvalMetrics, EvalListResponse } from '../os'

describe('Eval types', () => {
  it('should define EvalResult interface', () => {
    const result: EvalResult = {
      eval_id: 'eval-123',
      input: 'What is the capital of France?',
      expected_output: 'Paris',
      actual_output: 'Paris is the capital of France.',
      score: 0.95,
      passed: true,
      feedback: 'Correct answer with additional context'
    }
    expect(result.score).toBe(0.95)
    expect(result.passed).toBe(true)
  })

  it('should define EvalRun interface', () => {
    const run: EvalRun = {
      run_id: 'run-456',
      agent_id: 'agent-789',
      eval_set_name: 'accuracy_test',
      created_at: 1706400000,
      completed_at: 1706400060,
      status: 'completed',
      results: [],
      metrics: {
        accuracy: 0.92,
        avg_latency_ms: 1500,
        total_runs: 50,
        passed_count: 46,
        failed_count: 4
      }
    }
    expect(run.metrics.accuracy).toBe(0.92)
  })

  it('should define EvalListResponse interface', () => {
    const response: EvalListResponse = {
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total_count: 0,
        total_pages: 0
      }
    }
    expect(response.data).toEqual([])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/types/__tests__/evals.test.ts`
Expected: FAIL - EvalResult, EvalRun, etc. not defined

**Step 3: Write minimal implementation**

Add to `src/types/os.ts`:

```typescript
export interface EvalResult {
  eval_id: string
  input: string
  expected_output?: string
  actual_output: string
  score: number
  passed: boolean
  feedback?: string
  latency_ms?: number
}

export interface EvalMetrics {
  accuracy: number
  avg_latency_ms: number
  total_runs: number
  passed_count: number
  failed_count: number
}

export interface EvalRun {
  run_id: string
  agent_id: string
  eval_set_name: string
  created_at: number
  completed_at?: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  results: EvalResult[]
  metrics: EvalMetrics
}

export interface EvalListResponse {
  data: EvalRun[]
  meta: Pagination
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/types/__tests__/evals.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/os.ts src/types/__tests__/evals.test.ts
git commit -m "feat(types): add Eval types for quality monitoring"
```

---

## Task 3: Add Tracing and Evals API Routes

**Files:**

- Modify: `src/api/routes.ts`

**Step 1: Write the failing test**

```typescript
// Add to src/api/__tests__/routes.test.ts
describe('Tracing routes', () => {
  it('should generate GetTraces URL', () => {
    expect(APIRoutes.GetTraces(BASE_URL)).toBe(`${BASE_URL}/traces`)
  })

  it('should generate GetTrace URL with ID', () => {
    expect(APIRoutes.GetTrace(BASE_URL, 'trace-123')).toBe(
      `${BASE_URL}/traces/trace-123`
    )
  })

  it('should generate GetTracesBySession URL', () => {
    expect(APIRoutes.GetTracesBySession(BASE_URL, 'sess-456')).toBe(
      `${BASE_URL}/sessions/sess-456/traces`
    )
  })
})

describe('Evals routes', () => {
  it('should generate GetEvals URL', () => {
    expect(APIRoutes.GetEvals(BASE_URL)).toBe(`${BASE_URL}/evals`)
  })

  it('should generate GetEval URL with ID', () => {
    expect(APIRoutes.GetEval(BASE_URL, 'eval-123')).toBe(
      `${BASE_URL}/evals/eval-123`
    )
  })

  it('should generate RunEval URL', () => {
    expect(APIRoutes.RunEval(BASE_URL, 'agent-1')).toBe(
      `${BASE_URL}/agents/agent-1/evals`
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/api/__tests__/routes.test.ts`
Expected: FAIL - GetTraces, GetEvals, etc. not defined

**Step 3: Write minimal implementation**

Add to `src/api/routes.ts`:

```typescript
export const APIRoutes = {
  // ... existing routes ...

  // Tracing API
  GetTraces: (agentOSUrl: string) => `${agentOSUrl}/traces`,
  GetTrace: (agentOSUrl: string, traceId: string) =>
    `${agentOSUrl}/traces/${traceId}`,
  GetTracesBySession: (agentOSUrl: string, sessionId: string) =>
    `${agentOSUrl}/sessions/${sessionId}/traces`,
  GetTracesByRun: (agentOSUrl: string, runId: string) =>
    `${agentOSUrl}/runs/${runId}/traces`,

  // Evals API
  GetEvals: (agentOSUrl: string) => `${agentOSUrl}/evals`,
  GetEval: (agentOSUrl: string, evalId: string) =>
    `${agentOSUrl}/evals/${evalId}`,
  RunEval: (agentOSUrl: string, agentId: string) =>
    `${agentOSUrl}/agents/${agentId}/evals`
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/api/__tests__/routes.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/api/routes.ts src/api/__tests__/routes.test.ts
git commit -m "feat(api): add tracing and evals API routes"
```

---

## Task 4: Create useTraces Hook

**Files:**

- Create: `src/hooks/useTraces.ts`

**Step 1: Write the failing test**

```bash
touch src/hooks/__tests__/useTraces.test.ts
```

```typescript
// src/hooks/__tests__/useTraces.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTraces } from '../useTraces'

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

describe('useTraces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          {
            trace_id: 'trace-1',
            session_id: 'sess-1',
            run_id: 'run-1',
            start_time: 1706400000000,
            end_time: 1706400005000,
            duration_ms: 5000,
            status: 'ok',
            spans: []
          }
        ],
        meta: { page: 1, limit: 20, total_count: 1, total_pages: 1 }
      })
    })
  })

  it('should fetch traces', async () => {
    const { result } = renderHook(() => useTraces())

    await waitFor(() => {
      expect(result.current.traces).toHaveLength(1)
    })

    expect(result.current.traces[0].trace_id).toBe('trace-1')
  })

  it('should provide loading state', () => {
    const { result } = renderHook(() => useTraces())
    expect(typeof result.current.isLoading).toBe('boolean')
  })

  it('should support session filter', async () => {
    const { result } = renderHook(() => useTraces({ sessionId: 'sess-1' }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/sessions/sess-1/traces'),
      expect.any(Object)
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/hooks/__tests__/useTraces.test.ts`
Expected: FAIL - useTraces not found

**Step 3: Write minimal implementation**

```typescript
// src/hooks/useTraces.ts
import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'
import type { Trace } from '@/types/os'

interface UseTracesOptions {
  sessionId?: string
  runId?: string
  limit?: number
}

export function useTraces(options: UseTracesOptions = {}) {
  const { sessionId, runId, limit = 20 } = options
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const [traces, setTraces] = useState<Trace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
    return headers
  }, [authToken])

  const fetchTraces = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      let url: string

      if (sessionId) {
        url = APIRoutes.GetTracesBySession(endpointUrl, sessionId)
      } else if (runId) {
        url = APIRoutes.GetTracesByRun(endpointUrl, runId)
      } else {
        url = APIRoutes.GetTraces(endpointUrl)
      }

      url += `?limit=${limit}`

      const response = await fetch(url, {
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to fetch traces')
      }

      const data = await response.json()
      setTraces(data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [selectedEndpoint, sessionId, runId, limit, getHeaders])

  useEffect(() => {
    fetchTraces()
  }, [fetchTraces])

  return {
    traces,
    isLoading,
    error,
    refetch: fetchTraces
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/hooks/__tests__/useTraces.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useTraces.ts src/hooks/__tests__/useTraces.test.ts
git commit -m "feat(hooks): add useTraces hook for trace fetching"
```

---

## Task 5: Create useEvals Hook

**Files:**

- Create: `src/hooks/useEvals.ts`

**Step 1: Write the failing test**

```bash
touch src/hooks/__tests__/useEvals.test.ts
```

```typescript
// src/hooks/__tests__/useEvals.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useEvals } from '../useEvals'

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

describe('useEvals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          {
            run_id: 'eval-run-1',
            agent_id: 'agent-1',
            eval_set_name: 'accuracy_test',
            created_at: 1706400000,
            status: 'completed',
            results: [],
            metrics: {
              accuracy: 0.92,
              avg_latency_ms: 1500,
              total_runs: 50,
              passed_count: 46,
              failed_count: 4
            }
          }
        ],
        meta: { page: 1, limit: 20, total_count: 1, total_pages: 1 }
      })
    })
  })

  it('should fetch evals', async () => {
    const { result } = renderHook(() => useEvals())

    await waitFor(() => {
      expect(result.current.evalRuns).toHaveLength(1)
    })

    expect(result.current.evalRuns[0].metrics.accuracy).toBe(0.92)
  })

  it('should provide loading state', () => {
    const { result } = renderHook(() => useEvals())
    expect(typeof result.current.isLoading).toBe('boolean')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/hooks/__tests__/useEvals.test.ts`
Expected: FAIL - useEvals not found

**Step 3: Write minimal implementation**

```typescript
// src/hooks/useEvals.ts
import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'
import { constructEndpointUrl } from '@/lib/constructEndpointUrl'
import type { EvalRun } from '@/types/os'

interface UseEvalsOptions {
  agentId?: string
  limit?: number
}

export function useEvals(options: UseEvalsOptions = {}) {
  const { agentId, limit = 20 } = options
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const [evalRuns, setEvalRuns] = useState<EvalRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
    return headers
  }, [authToken])

  const fetchEvals = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      let url = APIRoutes.GetEvals(endpointUrl)

      const params = new URLSearchParams()
      params.set('limit', String(limit))
      if (agentId) {
        params.set('agent_id', agentId)
      }
      url += `?${params.toString()}`

      const response = await fetch(url, {
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to fetch evals')
      }

      const data = await response.json()
      setEvalRuns(data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [selectedEndpoint, agentId, limit, getHeaders])

  useEffect(() => {
    fetchEvals()
  }, [fetchEvals])

  return {
    evalRuns,
    isLoading,
    error,
    refetch: fetchEvals
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/hooks/__tests__/useEvals.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useEvals.ts src/hooks/__tests__/useEvals.test.ts
git commit -m "feat(hooks): add useEvals hook for evaluation data"
```

---

## Task 6: Create ReferenceCard Component

**Files:**

- Create: `src/components/chat/ChatArea/Messages/ReferenceCard.tsx`

**Step 1: Write the failing test**

```bash
mkdir -p src/components/chat/ChatArea/Messages/__tests__
touch src/components/chat/ChatArea/Messages/__tests__/ReferenceCard.test.tsx
```

```typescript
// src/components/chat/ChatArea/Messages/__tests__/ReferenceCard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReferenceCard } from '../ReferenceCard'

describe('ReferenceCard', () => {
  const mockReference = {
    name: 'company-policy.pdf',
    content: 'All employees must complete annual training by December 31st.',
    meta_data: {
      chunk: 3,
      chunk_size: 512
    }
  }

  it('should render reference name', () => {
    render(<ReferenceCard reference={mockReference} />)
    expect(screen.getByText('company-policy.pdf')).toBeInTheDocument()
  })

  it('should render content snippet', () => {
    render(<ReferenceCard reference={mockReference} />)
    expect(
      screen.getByText(/All employees must complete annual training/)
    ).toBeInTheDocument()
  })

  it('should render chunk metadata', () => {
    render(<ReferenceCard reference={mockReference} />)
    expect(screen.getByText(/Chunk 3/)).toBeInTheDocument()
  })

  it('should truncate long content', () => {
    const longRef = {
      ...mockReference,
      content: 'A'.repeat(500)
    }
    render(<ReferenceCard reference={longRef} maxLength={100} />)
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/chat/ChatArea/Messages/__tests__/ReferenceCard.test.tsx`
Expected: FAIL - ReferenceCard not found

**Step 3: Write minimal implementation**

```typescript
// src/components/chat/ChatArea/Messages/ReferenceCard.tsx
'use client'

import { FileText } from 'lucide-react'
import type { Reference } from '@/types/os'

interface ReferenceCardProps {
  reference: Reference
  maxLength?: number
}

export function ReferenceCard({ reference, maxLength = 200 }: ReferenceCardProps) {
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
          Chunk {reference.meta_data.chunk} · {reference.meta_data.chunk_size} chars
        </p>
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/chat/ChatArea/Messages/__tests__/ReferenceCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/ChatArea/Messages/ReferenceCard.tsx src/components/chat/ChatArea/Messages/__tests__/ReferenceCard.test.tsx
git commit -m "feat(ui): add ReferenceCard component for KB source display"
```

---

## Task 7: Create ReferenceList Component

**Files:**

- Create: `src/components/chat/ChatArea/Messages/ReferenceList.tsx`

**Step 1: Write the failing test**

```bash
touch src/components/chat/ChatArea/Messages/__tests__/ReferenceList.test.tsx
```

```typescript
// src/components/chat/ChatArea/Messages/__tests__/ReferenceList.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReferenceList } from '../ReferenceList'

describe('ReferenceList', () => {
  const mockReferences = [
    {
      name: 'doc1.pdf',
      content: 'First document content',
      meta_data: { chunk: 1, chunk_size: 256 }
    },
    {
      name: 'doc2.pdf',
      content: 'Second document content',
      meta_data: { chunk: 2, chunk_size: 512 }
    }
  ]

  it('should render collapsed by default', () => {
    render(<ReferenceList references={mockReferences} />)
    expect(screen.getByText('2 sources')).toBeInTheDocument()
    expect(screen.queryByText('doc1.pdf')).not.toBeInTheDocument()
  })

  it('should expand on click', () => {
    render(<ReferenceList references={mockReferences} />)
    fireEvent.click(screen.getByText('2 sources'))
    expect(screen.getByText('doc1.pdf')).toBeInTheDocument()
    expect(screen.getByText('doc2.pdf')).toBeInTheDocument()
  })

  it('should show singular source text for one reference', () => {
    render(<ReferenceList references={[mockReferences[0]]} />)
    expect(screen.getByText('1 source')).toBeInTheDocument()
  })

  it('should display query when provided', () => {
    render(<ReferenceList references={mockReferences} query="company policies" />)
    expect(screen.getByText('Query: company policies')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/chat/ChatArea/Messages/__tests__/ReferenceList.test.tsx`
Expected: FAIL - ReferenceList not found

**Step 3: Write minimal implementation**

```typescript
// src/components/chat/ChatArea/Messages/ReferenceList.tsx
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

  const sourceText = references.length === 1 ? '1 source' : `${references.length} sources`

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
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/chat/ChatArea/Messages/__tests__/ReferenceList.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/ChatArea/Messages/ReferenceList.tsx src/components/chat/ChatArea/Messages/__tests__/ReferenceList.test.tsx
git commit -m "feat(ui): add ReferenceList collapsible component"
```

---

## Task 8: Integrate ReferenceList in MessageItem

**Files:**

- Modify: `src/components/chat/ChatArea/Messages/MessageItem.tsx`

**Step 1: Read current implementation**

Run: Read `src/components/chat/ChatArea/Messages/MessageItem.tsx`

**Step 2: Add import and reference display**

Add import at top:

```typescript
import { ReferenceList } from './ReferenceList'
```

In `AgentMessage`, update the `messageContent` section where content is rendered. After the `MarkdownRenderer` and multimedia, add:

```typescript
// Inside the flex-col div, after Audios
// Note: extra_data.references is ReferenceData[], each containing a query and references[]
{message.extra_data?.references && message.extra_data.references.length > 0 && (
  <div className="mt-3 space-y-3">
    {message.extra_data.references.map((refData, idx) => (
      <ReferenceList 
        key={`ref-${idx}`}
        references={refData.references}
        query={refData.query}
      />
    ))}
  </div>
)}
```

**Step 3: Run validation**

Run: `pnpm validate`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/chat/ChatArea/Messages/MessageItem.tsx
git commit -m "feat(chat): integrate ReferenceList in agent messages"
```

---

## Task 9: Create SpanDetails Component

**Files:**

- Create: `src/components/tracing/SpanDetails.tsx`

**Step 1: Write the failing test**

```bash
mkdir -p src/components/tracing/__tests__
touch src/components/tracing/__tests__/SpanDetails.test.tsx
```

```typescript
// src/components/tracing/__tests__/SpanDetails.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SpanDetails } from '../SpanDetails'

describe('SpanDetails', () => {
  const mockSpan = {
    span_id: 'span-123',
    parent_span_id: null,
    name: 'llm_call',
    start_time: 1706400000000,
    end_time: 1706400001500,
    duration_ms: 1500,
    status: 'ok' as const,
    attributes: {
      model: 'gpt-4',
      tokens_input: 150,
      tokens_output: 200
    }
  }

  it('should render span name', () => {
    render(<SpanDetails span={mockSpan} />)
    expect(screen.getByText('llm_call')).toBeInTheDocument()
  })

  it('should render duration', () => {
    render(<SpanDetails span={mockSpan} />)
    expect(screen.getByText('1500ms')).toBeInTheDocument()
  })

  it('should render status badge', () => {
    render(<SpanDetails span={mockSpan} />)
    expect(screen.getByText('ok')).toBeInTheDocument()
  })

  it('should render attributes', () => {
    render(<SpanDetails span={mockSpan} />)
    expect(screen.getByText('gpt-4')).toBeInTheDocument()
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('should render error status with styling', () => {
    const errorSpan = {
      ...mockSpan,
      status: 'error' as const,
      error_message: 'Rate limit exceeded'
    }
    render(<SpanDetails span={errorSpan} />)
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/tracing/__tests__/SpanDetails.test.tsx`
Expected: FAIL - SpanDetails not found

**Step 3: Write minimal implementation**

```typescript
// src/components/tracing/SpanDetails.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Span } from '@/types/os'

interface SpanDetailsProps {
  span: Span
}

export function SpanDetails({ span }: SpanDetailsProps) {
  const statusColors = {
    ok: 'bg-green-500/10 text-green-600 dark:text-green-400',
    error: 'bg-red-500/10 text-red-600 dark:text-red-400',
    unset: 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
  }

  return (
    <div className="bg-card border-border rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-mono text-sm font-medium">{span.name}</h4>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">
            {span.duration_ms}ms
          </span>
          <Badge className={cn('text-xs', statusColors[span.status])}>
            {span.status}
          </Badge>
        </div>
      </div>

      {span.error_message && (
        <div className="mb-3 rounded-md bg-red-500/10 p-2 text-sm text-red-600 dark:text-red-400">
          {span.error_message}
        </div>
      )}

      {Object.keys(span.attributes).length > 0 && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs uppercase">Attributes</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(span.attributes).map(([key, value]) => (
              <div key={key} className="text-sm">
                <span className="text-muted-foreground">{key}:</span>{' '}
                <span className="font-mono">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/tracing/__tests__/SpanDetails.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/tracing/SpanDetails.tsx src/components/tracing/__tests__/SpanDetails.test.tsx
git commit -m "feat(tracing): add SpanDetails component"
```

---

## Task 10: Create TreeView Component

**Files:**

- Create: `src/components/tracing/TreeView.tsx`

**Step 1: Write the failing test**

```bash
touch src/components/tracing/__tests__/TreeView.test.tsx
```

```typescript
// src/components/tracing/__tests__/TreeView.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TreeView } from '../TreeView'

describe('TreeView', () => {
  const mockSpans = [
    {
      span_id: 'span-1',
      parent_span_id: null,
      name: 'agent_run',
      start_time: 1706400000000,
      end_time: 1706400005000,
      duration_ms: 5000,
      status: 'ok' as const,
      attributes: {}
    },
    {
      span_id: 'span-2',
      parent_span_id: 'span-1',
      name: 'llm_call',
      start_time: 1706400001000,
      end_time: 1706400003000,
      duration_ms: 2000,
      status: 'ok' as const,
      attributes: { model: 'gpt-4' }
    },
    {
      span_id: 'span-3',
      parent_span_id: 'span-1',
      name: 'tool_call',
      start_time: 1706400003000,
      end_time: 1706400004000,
      duration_ms: 1000,
      status: 'ok' as const,
      attributes: { tool: 'search' }
    }
  ]

  it('should render root spans', () => {
    render(<TreeView spans={mockSpans} onSelectSpan={vi.fn()} />)
    expect(screen.getByText('agent_run')).toBeInTheDocument()
  })

  it('should render child spans indented', () => {
    render(<TreeView spans={mockSpans} onSelectSpan={vi.fn()} />)
    expect(screen.getByText('llm_call')).toBeInTheDocument()
    expect(screen.getByText('tool_call')).toBeInTheDocument()
  })

  it('should call onSelectSpan when clicked', () => {
    const onSelectSpan = vi.fn()
    render(<TreeView spans={mockSpans} onSelectSpan={onSelectSpan} />)
    fireEvent.click(screen.getByText('llm_call'))
    expect(onSelectSpan).toHaveBeenCalledWith(mockSpans[1])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/tracing/__tests__/TreeView.test.tsx`
Expected: FAIL - TreeView not found

**Step 3: Write minimal implementation**

```typescript
// src/components/tracing/TreeView.tsx
'use client'

import { useMemo } from 'react'
import { ChevronRight, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Span } from '@/types/os'

interface TreeViewProps {
  spans: Span[]
  onSelectSpan: (span: Span) => void
  selectedSpanId?: string
}

interface SpanNode {
  span: Span
  children: SpanNode[]
}

function buildTree(spans: Span[]): SpanNode[] {
  const spanMap = new Map<string, SpanNode>()
  const roots: SpanNode[] = []

  // Create nodes
  spans.forEach((span) => {
    spanMap.set(span.span_id, { span, children: [] })
  })

  // Build tree
  spans.forEach((span) => {
    const node = spanMap.get(span.span_id)!
    if (span.parent_span_id && spanMap.has(span.parent_span_id)) {
      spanMap.get(span.parent_span_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function SpanTreeNode({
  node,
  depth,
  onSelectSpan,
  selectedSpanId
}: {
  node: SpanNode
  depth: number
  onSelectSpan: (span: Span) => void
  selectedSpanId?: string
}) {
  const statusColors = {
    ok: 'text-green-500',
    error: 'text-red-500',
    unset: 'text-gray-400'
  }

  return (
    <div>
      <button
        onClick={() => onSelectSpan(node.span)}
        className={cn(
          'hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
          selectedSpanId === node.span.span_id && 'bg-accent'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.children.length > 0 ? (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Circle className={cn('h-2 w-2 shrink-0', statusColors[node.span.status])} />
        )}
        <span className="font-mono">{node.span.name}</span>
        <span className="text-muted-foreground ml-auto text-xs">
          {node.span.duration_ms}ms
        </span>
      </button>
      {node.children.map((child) => (
        <SpanTreeNode
          key={child.span.span_id}
          node={child}
          depth={depth + 1}
          onSelectSpan={onSelectSpan}
          selectedSpanId={selectedSpanId}
        />
      ))}
    </div>
  )
}

export function TreeView({ spans, onSelectSpan, selectedSpanId }: TreeViewProps) {
  const tree = useMemo(() => buildTree(spans), [spans])

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <SpanTreeNode
          key={node.span.span_id}
          node={node}
          depth={0}
          onSelectSpan={onSelectSpan}
          selectedSpanId={selectedSpanId}
        />
      ))}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/tracing/__tests__/TreeView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/tracing/TreeView.tsx src/components/tracing/__tests__/TreeView.test.tsx
git commit -m "feat(tracing): add TreeView hierarchical span component"
```

---

## Task 11: Create WaterfallView Component

**Files:**

- Create: `src/components/tracing/WaterfallView.tsx`

**Step 1: Write the failing test**

```bash
touch src/components/tracing/__tests__/WaterfallView.test.tsx
```

```typescript
// src/components/tracing/__tests__/WaterfallView.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WaterfallView } from '../WaterfallView'

describe('WaterfallView', () => {
  const mockSpans = [
    {
      span_id: 'span-1',
      parent_span_id: null,
      name: 'agent_run',
      start_time: 1706400000000,
      end_time: 1706400005000,
      duration_ms: 5000,
      status: 'ok' as const,
      attributes: {}
    },
    {
      span_id: 'span-2',
      parent_span_id: 'span-1',
      name: 'llm_call',
      start_time: 1706400001000,
      end_time: 1706400003000,
      duration_ms: 2000,
      status: 'ok' as const,
      attributes: {}
    }
  ]

  it('should render all spans', () => {
    render(<WaterfallView spans={mockSpans} totalDuration={5000} onSelectSpan={vi.fn()} />)
    expect(screen.getByText('agent_run')).toBeInTheDocument()
    expect(screen.getByText('llm_call')).toBeInTheDocument()
  })

  it('should display duration labels', () => {
    render(<WaterfallView spans={mockSpans} totalDuration={5000} onSelectSpan={vi.fn()} />)
    expect(screen.getByText('5000ms')).toBeInTheDocument()
    expect(screen.getByText('2000ms')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/tracing/__tests__/WaterfallView.test.tsx`
Expected: FAIL - WaterfallView not found

**Step 3: Write minimal implementation**

```typescript
// src/components/tracing/WaterfallView.tsx
'use client'

import { cn } from '@/lib/utils'
import type { Span } from '@/types/os'

interface WaterfallViewProps {
  spans: Span[]
  totalDuration: number
  onSelectSpan: (span: Span) => void
  selectedSpanId?: string
}

export function WaterfallView({
  spans,
  totalDuration,
  onSelectSpan,
  selectedSpanId
}: WaterfallViewProps) {
  const minTime = Math.min(...spans.map((s) => s.start_time))

  const statusColors = {
    ok: 'bg-green-500',
    error: 'bg-red-500',
    unset: 'bg-gray-400'
  }

  return (
    <div className="space-y-1">
      {spans.map((span) => {
        const startOffset = ((span.start_time - minTime) / (totalDuration * 1000)) * 100
        const width = (span.duration_ms / totalDuration) * 100

        return (
          <button
            key={span.span_id}
            onClick={() => onSelectSpan(span)}
            className={cn(
              'hover:bg-accent/50 flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors',
              selectedSpanId === span.span_id && 'bg-accent'
            )}
          >
            <span className="w-24 shrink-0 truncate font-mono text-xs">
              {span.name}
            </span>
            <div className="bg-secondary relative h-4 flex-1 rounded-full">
              <div
                className={cn(
                  'absolute h-full rounded-full',
                  statusColors[span.status]
                )}
                style={{
                  left: `${startOffset}%`,
                  width: `${Math.max(width, 1)}%`
                }}
              />
            </div>
            <span className="text-muted-foreground w-16 shrink-0 text-right text-xs">
              {span.duration_ms}ms
            </span>
          </button>
        )
      })}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/tracing/__tests__/WaterfallView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/tracing/WaterfallView.tsx src/components/tracing/__tests__/WaterfallView.test.tsx
git commit -m "feat(tracing): add WaterfallView timeline component"
```

---

## Task 12: Create TraceList Component

**Files:**

- Create: `src/components/tracing/TraceList.tsx`

**Step 1: Write the failing test**

```bash
touch src/components/tracing/__tests__/TraceList.test.tsx
```

```typescript
// src/components/tracing/__tests__/TraceList.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TraceList } from '../TraceList'

describe('TraceList', () => {
  const mockTraces = [
    {
      trace_id: 'trace-1',
      session_id: 'sess-1',
      run_id: 'run-1',
      start_time: 1706400000000,
      end_time: 1706400005000,
      duration_ms: 5000,
      status: 'ok' as const,
      spans: [],
      total_tokens: 350
    },
    {
      trace_id: 'trace-2',
      session_id: 'sess-2',
      run_id: 'run-2',
      start_time: 1706400010000,
      end_time: 1706400015000,
      duration_ms: 5000,
      status: 'error' as const,
      spans: [],
      total_tokens: 200
    }
  ]

  it('should render all traces', () => {
    render(<TraceList traces={mockTraces} onSelectTrace={vi.fn()} />)
    expect(screen.getByText('trace-1')).toBeInTheDocument()
    expect(screen.getByText('trace-2')).toBeInTheDocument()
  })

  it('should display duration', () => {
    render(<TraceList traces={mockTraces} onSelectTrace={vi.fn()} />)
    expect(screen.getAllByText('5000ms')).toHaveLength(2)
  })

  it('should call onSelectTrace when clicked', () => {
    const onSelectTrace = vi.fn()
    render(<TraceList traces={mockTraces} onSelectTrace={onSelectTrace} />)
    fireEvent.click(screen.getByText('trace-1'))
    expect(onSelectTrace).toHaveBeenCalledWith(mockTraces[0])
  })

  it('should display token count', () => {
    render(<TraceList traces={mockTraces} onSelectTrace={vi.fn()} />)
    expect(screen.getByText('350 tokens')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/tracing/__tests__/TraceList.test.tsx`
Expected: FAIL - TraceList not found

**Step 3: Write minimal implementation**

```typescript
// src/components/tracing/TraceList.tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Trace } from '@/types/os'

interface TraceListProps {
  traces: Trace[]
  onSelectTrace: (trace: Trace) => void
  selectedTraceId?: string
}

export function TraceList({ traces, onSelectTrace, selectedTraceId }: TraceListProps) {
  const statusColors = {
    ok: 'bg-green-500/10 text-green-600 dark:text-green-400',
    error: 'bg-red-500/10 text-red-600 dark:text-red-400',
    unset: 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (traces.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        No traces found
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {traces.map((trace) => (
        <button
          key={trace.trace_id}
          onClick={() => onSelectTrace(trace)}
          className={cn(
            'border-border hover:bg-accent flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors',
            selectedTraceId === trace.trace_id && 'bg-accent border-primary/20'
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm">{trace.trace_id}</p>
            <p className="text-muted-foreground text-xs">
              {formatTime(trace.start_time)} · {trace.duration_ms}ms
              {trace.total_tokens && ` · ${trace.total_tokens} tokens`}
            </p>
          </div>
          <Badge className={cn('ml-2 shrink-0', statusColors[trace.status])}>
            {trace.status}
          </Badge>
        </button>
      ))}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/tracing/__tests__/TraceList.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/tracing/TraceList.tsx src/components/tracing/__tests__/TraceList.test.tsx
git commit -m "feat(tracing): add TraceList component"
```

---

## Task 13: Create Tracing Page

**Files:**

- Create: `src/app/(main)/tracing/page.tsx`

**Step 1: Write the failing test**

```bash
mkdir -p src/app/\(main\)/tracing/__tests__
touch src/app/\(main\)/tracing/__tests__/page.test.tsx
```

```typescript
// src/app/(main)/tracing/__tests__/page.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TracingPage from '../page'

vi.mock('@/hooks/useTraces', () => ({
  useTraces: () => ({
    traces: [],
    isLoading: false,
    error: null
  })
}))

describe('TracingPage', () => {
  it('should render page title', () => {
    render(<TracingPage />)
    expect(screen.getByText('Tracing')).toBeInTheDocument()
  })

  it('should render view toggle', () => {
    render(<TracingPage />)
    expect(screen.getByText('Tree')).toBeInTheDocument()
    expect(screen.getByText('Waterfall')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/app/\(main\)/tracing/__tests__/page.test.tsx`
Expected: FAIL - page.tsx not found

**Step 3: Write minimal implementation**

```typescript
// src/app/(main)/tracing/page.tsx
'use client'

import { useState } from 'react'
import { useTraces } from '@/hooks/useTraces'
import { TraceList } from '@/components/tracing/TraceList'
import { TreeView } from '@/components/tracing/TreeView'
import { WaterfallView } from '@/components/tracing/WaterfallView'
import { SpanDetails } from '@/components/tracing/SpanDetails'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Trace, Span } from '@/types/os'

type ViewMode = 'tree' | 'waterfall'

export default function TracingPage() {
  const { traces, isLoading, error } = useTraces()
  const [selectedTrace, setSelectedTrace] = useState<Trace | null>(null)
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('tree')

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="mb-6 h-8 w-32" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
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
      <h1 className="text-foreground mb-6 text-2xl font-semibold">Tracing</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trace list */}
        <div className="lg:col-span-1">
          <h2 className="text-foreground mb-3 text-sm font-medium uppercase">
            Recent Traces
          </h2>
          <TraceList
            traces={traces}
            onSelectTrace={(trace) => {
              setSelectedTrace(trace)
              setSelectedSpan(null)
            }}
            selectedTraceId={selectedTrace?.trace_id}
          />
        </div>

        {/* Span view */}
        <div className="lg:col-span-2">
          {selectedTrace ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-foreground text-sm font-medium uppercase">
                  Spans
                </h2>
                <div className="bg-secondary flex rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('tree')}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      viewMode === 'tree'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Tree
                  </button>
                  <button
                    onClick={() => setViewMode('waterfall')}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      viewMode === 'waterfall'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Waterfall
                  </button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="border-border rounded-lg border p-4">
                  {viewMode === 'tree' ? (
                    <TreeView
                      spans={selectedTrace.spans}
                      onSelectSpan={setSelectedSpan}
                      selectedSpanId={selectedSpan?.span_id}
                    />
                  ) : (
                    <WaterfallView
                      spans={selectedTrace.spans}
                      totalDuration={selectedTrace.duration_ms}
                      onSelectSpan={setSelectedSpan}
                      selectedSpanId={selectedSpan?.span_id}
                    />
                  )}
                </div>

                <div>
                  {selectedSpan ? (
                    <SpanDetails span={selectedSpan} />
                  ) : (
                    <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                      Select a span to view details
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">
              Select a trace to view spans
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/app/\(main\)/tracing/__tests__/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/\(main\)/tracing/page.tsx src/app/\(main\)/tracing/__tests__/page.test.tsx
git commit -m "feat(tracing): add tracing page with tree and waterfall views"
```

---

## Task 14: Create AccuracyChart Component

**Files:**

- Create: `src/components/evals/AccuracyChart.tsx`

**Step 1: Write the failing test**

```bash
mkdir -p src/components/evals/__tests__
touch src/components/evals/__tests__/AccuracyChart.test.tsx
```

```typescript
// src/components/evals/__tests__/AccuracyChart.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AccuracyChart } from '../AccuracyChart'

describe('AccuracyChart', () => {
  const mockData = [
    { date: '2024-01-25', accuracy: 0.88 },
    { date: '2024-01-26', accuracy: 0.91 },
    { date: '2024-01-27', accuracy: 0.92 }
  ]

  it('should render chart title', () => {
    render(<AccuracyChart data={mockData} />)
    expect(screen.getByText('Accuracy Trend')).toBeInTheDocument()
  })

  it('should render current accuracy', () => {
    render(<AccuracyChart data={mockData} currentAccuracy={0.92} />)
    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  it('should show empty state when no data', () => {
    render(<AccuracyChart data={[]} />)
    expect(screen.getByText(/No data/)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/evals/__tests__/AccuracyChart.test.tsx`
Expected: FAIL - AccuracyChart not found

**Step 3: Write minimal implementation**

```typescript
// src/components/evals/AccuracyChart.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AccuracyDataPoint {
  date: string
  accuracy: number
}

interface AccuracyChartProps {
  data: AccuracyDataPoint[]
  currentAccuracy?: number
}

export function AccuracyChart({ data, currentAccuracy }: AccuracyChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Accuracy Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
            No data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Simple bar chart without external dependency
  const maxAccuracy = Math.max(...data.map((d) => d.accuracy))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Accuracy Trend</CardTitle>
        {currentAccuracy !== undefined && (
          <span className="text-2xl font-bold text-green-600">
            {Math.round(currentAccuracy * 100)}%
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-end gap-1">
          {data.map((point, index) => (
            <div
              key={point.date}
              className="bg-brand/80 hover:bg-brand flex-1 rounded-t transition-colors"
              style={{
                height: `${(point.accuracy / maxAccuracy) * 100}%`
              }}
              title={`${point.date}: ${Math.round(point.accuracy * 100)}%`}
            />
          ))}
        </div>
        <div className="text-muted-foreground mt-2 flex justify-between text-xs">
          <span>{data[0]?.date}</span>
          <span>{data[data.length - 1]?.date}</span>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/evals/__tests__/AccuracyChart.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/evals/AccuracyChart.tsx src/components/evals/__tests__/AccuracyChart.test.tsx
git commit -m "feat(evals): add AccuracyChart component"
```

---

## Task 15: Create PerformanceMetrics Component

**Files:**

- Create: `src/components/evals/PerformanceMetrics.tsx`

**Step 1: Write the failing test**

```bash
touch src/components/evals/__tests__/PerformanceMetrics.test.tsx
```

```typescript
// src/components/evals/__tests__/PerformanceMetrics.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PerformanceMetrics } from '../PerformanceMetrics'

describe('PerformanceMetrics', () => {
  const mockMetrics = {
    accuracy: 0.92,
    avg_latency_ms: 1500,
    total_runs: 50,
    passed_count: 46,
    failed_count: 4
  }

  it('should render accuracy percentage', () => {
    render(<PerformanceMetrics metrics={mockMetrics} />)
    expect(screen.getByText('92%')).toBeInTheDocument()
  })

  it('should render latency', () => {
    render(<PerformanceMetrics metrics={mockMetrics} />)
    expect(screen.getByText('1500ms')).toBeInTheDocument()
  })

  it('should render pass/fail counts', () => {
    render(<PerformanceMetrics metrics={mockMetrics} />)
    expect(screen.getByText('46')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('should render total runs', () => {
    render(<PerformanceMetrics metrics={mockMetrics} />)
    expect(screen.getByText('50')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/evals/__tests__/PerformanceMetrics.test.tsx`
Expected: FAIL - PerformanceMetrics not found

**Step 3: Write minimal implementation**

```typescript
// src/components/evals/PerformanceMetrics.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Clock, Target } from 'lucide-react'
import type { EvalMetrics } from '@/types/os'

interface PerformanceMetricsProps {
  metrics: EvalMetrics
}

export function PerformanceMetrics({ metrics }: PerformanceMetricsProps) {
  const stats = [
    {
      label: 'Accuracy',
      value: `${Math.round(metrics.accuracy * 100)}%`,
      icon: Target,
      color: 'text-green-600'
    },
    {
      label: 'Avg Latency',
      value: `${metrics.avg_latency_ms}ms`,
      icon: Clock,
      color: 'text-blue-600'
    },
    {
      label: 'Passed',
      value: String(metrics.passed_count),
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      label: 'Failed',
      value: String(metrics.failed_count),
      icon: XCircle,
      color: 'text-red-600'
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {stat.label}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
      <Card className="col-span-2 md:col-span-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            Total Runs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total_runs}</div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/evals/__tests__/PerformanceMetrics.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/evals/PerformanceMetrics.tsx src/components/evals/__tests__/PerformanceMetrics.test.tsx
git commit -m "feat(evals): add PerformanceMetrics component"
```

---

## Task 16: Create ReliabilityTable Component

**Files:**

- Create: `src/components/evals/ReliabilityTable.tsx`

**Step 1: Write the failing test**

```bash
touch src/components/evals/__tests__/ReliabilityTable.test.tsx
```

```typescript
// src/components/evals/__tests__/ReliabilityTable.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReliabilityTable } from '../ReliabilityTable'

describe('ReliabilityTable', () => {
  const mockResults = [
    {
      eval_id: 'eval-1',
      input: 'What is 2+2?',
      expected_output: '4',
      actual_output: '4',
      score: 1.0,
      passed: true
    },
    {
      eval_id: 'eval-2',
      input: 'Explain quantum physics',
      expected_output: 'Complex explanation',
      actual_output: 'Simple explanation',
      score: 0.7,
      passed: false,
      feedback: 'Missing key concepts'
    }
  ]

  it('should render all results', () => {
    render(<ReliabilityTable results={mockResults} />)
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument()
    expect(screen.getByText('Explain quantum physics')).toBeInTheDocument()
  })

  it('should show pass/fail badges', () => {
    render(<ReliabilityTable results={mockResults} />)
    expect(screen.getByText('Passed')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('should display scores', () => {
    render(<ReliabilityTable results={mockResults} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
  })

  it('should show feedback when available', () => {
    render(<ReliabilityTable results={mockResults} />)
    expect(screen.getByText('Missing key concepts')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/evals/__tests__/ReliabilityTable.test.tsx`
Expected: FAIL - ReliabilityTable not found

**Step 3: Write minimal implementation**

```typescript
// src/components/evals/ReliabilityTable.tsx
'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import type { EvalResult } from '@/types/os'

interface ReliabilityTableProps {
  results: EvalResult[]
}

export function ReliabilityTable({ results }: ReliabilityTableProps) {
  if (results.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm">
        No evaluation results
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[30%]">Input</TableHead>
          <TableHead className="w-[25%]">Expected</TableHead>
          <TableHead className="w-[25%]">Actual</TableHead>
          <TableHead>Score</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((result) => (
          <TableRow key={result.eval_id}>
            <TableCell className="max-w-0">
              <p className="truncate font-medium">{result.input}</p>
            </TableCell>
            <TableCell className="max-w-0">
              <p className="text-muted-foreground truncate text-sm">
                {result.expected_output ?? '-'}
              </p>
            </TableCell>
            <TableCell className="max-w-0">
              <p className="truncate text-sm">{result.actual_output}</p>
              {result.feedback && (
                <p className="text-muted-foreground mt-1 truncate text-xs">
                  {result.feedback}
                </p>
              )}
            </TableCell>
            <TableCell>
              <span className="font-mono text-sm">
                {Math.round(result.score * 100)}%
              </span>
            </TableCell>
            <TableCell>
              <Badge
                className={
                  result.passed
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                }
              >
                {result.passed ? 'Passed' : 'Failed'}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/evals/__tests__/ReliabilityTable.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/evals/ReliabilityTable.tsx src/components/evals/__tests__/ReliabilityTable.test.tsx
git commit -m "feat(evals): add ReliabilityTable component"
```

---

## Task 17: Create Evals Page

**Files:**

- Create: `src/app/(main)/evals/page.tsx`

**Step 1: Write the failing test**

```bash
mkdir -p src/app/\(main\)/evals/__tests__
touch src/app/\(main\)/evals/__tests__/page.test.tsx
```

```typescript
// src/app/(main)/evals/__tests__/page.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import EvalsPage from '../page'

vi.mock('@/hooks/useEvals', () => ({
  useEvals: () => ({
    evalRuns: [],
    isLoading: false,
    error: null
  })
}))

describe('EvalsPage', () => {
  it('should render page title', () => {
    render(<EvalsPage />)
    expect(screen.getByText('Evaluations')).toBeInTheDocument()
  })

  it('should show empty state when no evals', () => {
    render(<EvalsPage />)
    expect(screen.getByText(/No evaluation runs/)).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/app/\(main\)/evals/__tests__/page.test.tsx`
Expected: FAIL - page.tsx not found

**Step 3: Write minimal implementation**

```typescript
// src/app/(main)/evals/page.tsx
'use client'

import { useState } from 'react'
import { useEvals } from '@/hooks/useEvals'
import { AccuracyChart } from '@/components/evals/AccuracyChart'
import { PerformanceMetrics } from '@/components/evals/PerformanceMetrics'
import { ReliabilityTable } from '@/components/evals/ReliabilityTable'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { EvalRun } from '@/types/os'

export default function EvalsPage() {
  const { evalRuns, isLoading, error } = useEvals()
  const [selectedRun, setSelectedRun] = useState<EvalRun | null>(null)

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="mb-6 h-8 w-40" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
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

  // Build accuracy trend data from eval runs
  const accuracyData = evalRuns.map((run) => ({
    date: new Date(run.created_at * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }),
    accuracy: run.metrics.accuracy
  }))

  const latestRun = evalRuns[0]

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-foreground mb-6 text-2xl font-semibold">
        Evaluations
      </h1>

      {evalRuns.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          No evaluation runs yet. Run evaluations against your agents to see
          quality metrics.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metrics overview */}
          {latestRun && <PerformanceMetrics metrics={latestRun.metrics} />}

          {/* Accuracy trend */}
          <AccuracyChart
            data={accuracyData}
            currentAccuracy={latestRun?.metrics.accuracy}
          />

          {/* Run selection */}
          <div>
            <h2 className="text-foreground mb-3 text-sm font-medium uppercase">
              Evaluation Runs
            </h2>
            <div className="flex flex-wrap gap-2">
              {evalRuns.map((run) => (
                <button
                  key={run.run_id}
                  onClick={() => setSelectedRun(run)}
                  className={cn(
                    'border-border hover:bg-accent rounded-lg border px-3 py-2 text-sm transition-colors',
                    selectedRun?.run_id === run.run_id && 'bg-accent border-primary/20'
                  )}
                >
                  <span className="font-medium">{run.eval_set_name}</span>
                  <span className="text-muted-foreground ml-2">
                    {new Date(run.created_at * 1000).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Results table */}
          {selectedRun && (
            <div>
              <h2 className="text-foreground mb-3 text-sm font-medium uppercase">
                Results: {selectedRun.eval_set_name}
              </h2>
              <ReliabilityTable results={selectedRun.results} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/app/\(main\)/evals/__tests__/page.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/\(main\)/evals/page.tsx src/app/\(main\)/evals/__tests__/page.test.tsx
git commit -m "feat(evals): add evals page with metrics and results"
```

---

## Task 18: Final Validation

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

- `Span`, `Trace`, `TraceListResponse`
- `EvalResult`, `EvalMetrics`, `EvalRun`, `EvalListResponse`

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 3 observability implementation

- Add tracing dashboard with tree and waterfall views
- Add evals dashboard with accuracy charts and metrics
- Add reference/context display in chat messages
- Create useTraces and useEvals hooks
- Add all tracing and eval types
- Add API routes for tracing and evals endpoints"
```

---

## Summary

| Task | Component | Status |
|------|-----------|--------|
| 1-2 | Types (Trace, Span, Eval) | Pending |
| 3 | API Routes (Tracing, Evals) | Pending |
| 4-5 | Hooks (useTraces, useEvals) | Pending |
| 6-8 | Reference Display (Card, List, Integration) | Pending |
| 9-12 | Tracing Components (SpanDetails, TreeView, WaterfallView, TraceList) | Pending |
| 13 | Tracing Page | Pending |
| 14-16 | Evals Components (AccuracyChart, PerformanceMetrics, ReliabilityTable) | Pending |
| 17 | Evals Page | Pending |
| 18 | Final Validation | Pending |

**Total estimated tasks:** 18
**Each task follows TDD:** Test → Fail → Implement → Pass → Commit
