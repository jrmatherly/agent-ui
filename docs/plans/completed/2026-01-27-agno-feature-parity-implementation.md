# Agno Feature Parity Implementation Plan

**Created:** 2026-01-27
**Status:** Draft - Pending Approval
**Based On:** [research_agno_uiux_enhancements_2026-01-27.md](/claudedocs/research_agno_uiux_enhancements_2026-01-27.md)
**Estimated Effort:** 14-18 sprints (2-week sprints)

---

## Validation Summary (2026-01-27)

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Run Cancellation | ✅ VALIDATED | Endpoint and event handling correct |
| 2. HITL Confirmation | ⚠️ CORRECTIONS NEEDED | Endpoint path and payload structure updated below |
| 3. Guardrails | ❌ ARCHITECTURE WRONG | Guardrails are pre-hooks, NOT streaming events - see corrections |
| 4. Workflows UI | ✅ VALIDATED | API endpoints and events correct |
| 5. Memory Management | ✅ VALIDATED | All CRUD endpoints verified |
| 6. Empty States | ✅ VALIDATED | UI enhancement, no backend dependency |
| 7-8. Tracing/Evals | ✅ VALIDATED | Endpoints confirmed from OpenAPI spec |
| 9. Knowledge Explorer | ✅ VALIDATED | Existing routes, enhancement only |
| 10. Polish | ✅ VALIDATED | UI-only changes |

### Critical Corrections Applied:

1. **Phase 2 HITL**: Fixed endpoint from `/v1/runs/{id}/continue` to `/agents/{id}/runs/{id}/continue`
2. **Phase 2 HITL**: Fixed payload to use `tool_call_id` + `confirmed: boolean` instead of `requirement_id` + `action`
3. **Phase 3 Guardrails**: **REMOVED** - Agno uses `pre_hooks` that throw `InputCheckError` before execution, NOT streaming events
4. **Phase 5 Memory**: Fixed endpoint prefix from `/v1/memories` to `/memories` (no v1 prefix)
5. **Phase 7-8 Tracing/Evals**: Added complete API schemas and hook implementations from OpenAPI spec

---

## Executive Summary

This implementation plan addresses **14 feature parity gaps** between the agent-ui and Agno's backend capabilities. The plan is organized into 10 phases, prioritizing production-critical features (HITL, run cancellation) before observability (tracing, evals) and polish features.

### Priority Overview

| Priority | Features | Sprints |
|----------|----------|---------|
| **P0** | Run Cancellation, HITL Confirmation, Dashboard Fixes | 1-3 |
| **P1** | Workflows UI, Memory Panel, Guardrails, Empty States | 4-8 |
| **P2** | Tracing, Evals, Knowledge Explorer, Settings Hub | 9-12 |
| **P3** | Team Delegation, Navigation, Branding, Accessibility | 13-16 |

### Key Deliverables

- **31 new files** (components, hooks, pages, API routes)
- **12 modified files** (stream handlers, store, existing components)
- **4 new routes** (/memory, /tracing, /evals, /knowledge)

---

## Phase 1: Quick Wins & Production Blockers (P0)

**Timeline:** Sprint 1  
**Owner:** TBD

### 1.1 Run Cancellation Button

> **Production Blocker:** Users cannot stop long-running agents.

**Codebase Status:**

- `RunEvent.RunCancelled` type exists in `src/types/os.ts`
- `TeamRunCancelled` handler exists at `useAIStreamHandler.tsx:328`
- Missing: UI trigger button

**Files:**

| Action | File | Description |
|--------|------|-------------|
| NEW | `src/hooks/useCancelRun.ts` | Mutation hook for cancel endpoint |
| MODIFY | `src/components/chat/ChatArea/ChatInput.tsx` | Add stop button during streaming |
| MODIFY | `src/store/index.ts` | Add `currentRunId` tracking |

**Implementation:**

```typescript
// src/hooks/useCancelRun.ts
import { useMutation } from '@tanstack/react-query'
import { useStore } from '@/store'

export function useCancelRun() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)

  return useMutation({
    mutationFn: async ({ 
      agentId, 
      runId 
    }: { 
      agentId: string
      runId: string 
    }) => {
      const res = await fetch(
        `${selectedEndpoint}/v1/agents/${agentId}/runs/${runId}/cancel`,
        {
          method: 'POST',
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        }
      )
      if (!res.ok) throw new Error('Failed to cancel run')
      return res.json()
    }
  })
}
```

**ChatInput.tsx Changes:**

```tsx
import { StopCircle, Send } from 'lucide-react'

// Replace send button during streaming
{isStreaming ? (
  <Button
    variant="ghost"
    size="icon"
    onClick={() => cancelRun({ agentId: selectedAgent.agent_id, runId: currentRunId })}
    className="text-destructive hover:text-destructive/80"
    aria-label="Stop generation"
  >
    <StopCircle className="h-5 w-5" />
  </Button>
) : (
  <Button type="submit" size="icon" className="bg-brand">
    <Send className="h-5 w-5" />
  </Button>
)}
```

### 1.2 Session Metrics Display

**Quick Win:** Show token usage in session list.

**Files:**

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/components/chat/Sidebar/Sessions/SessionItem.tsx` | Add token badge |

**Implementation:**

```tsx
<div className="flex items-center gap-2 text-xs text-muted-foreground">
  {session.session_data?.metrics?.total_tokens && (
    <Badge variant="secondary" className="text-xs font-mono">
      {session.session_data.metrics.total_tokens.toLocaleString()} tokens
    </Badge>
  )}
  <span>{formatRelativeTime(session.updated_at)}</span>
</div>
```

### 1.3 Dashboard Data Fixes

*(Carried over from enterprise enhancement review)*

**Files:**

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/components/dashboard/UsageStats.tsx` | Loading skeletons, error states |
| MODIFY | `src/components/dashboard/AdminMetrics.tsx` | Refresh toast, timestamp |

---

## Phase 2: HITL Confirmation Flow (P0)

**Timeline:** Sprints 2-3  
**Owner:** TBD

> **Production Blocker:** Agents with `requires_confirmation=True` tools will hang without HITL support.

**Codebase Status:**

- `RunPaused` type exists in `src/types/os.ts`
- No handler in `useAIStreamHandler.tsx`
- No confirmation UI components

### 2.1 Store Updates

> **VALIDATED (2026-01-27)**: Updated field names to match Agno's `active_requirements` structure.

**File:** `src/store/index.ts`

```typescript
interface HITLState {
  isPaused: boolean
  agentId: string | null
  runId: string | null
  requirements: HITLRequirement[]
  clearHITL: () => void
}

interface HITLRequirement {
  tool_call_id: string
  tool_name: string
  tool_args: Record<string, unknown>
  needs_confirmation: boolean
  confirmed?: boolean
}

const createHITLSlice = (set: SetState<Store>) => ({
  isPaused: false,
  agentId: null,
  runId: null,
  requirements: [],
  clearHITL: () => set({ isPaused: false, agentId: null, runId: null, requirements: [] })
})
```

### 2.2 Stream Handler Updates

**File:** `src/hooks/useAIStreamHandler.tsx`

Add to SSE event handler:

```typescript
// Handle paused runs
if (event.event === 'RunPaused' || event.is_paused) {
  setHITLState({
    isPaused: true,
    runId: event.run_id,
    requirements: event.active_requirements || []
  })
  return // Wait for user resolution
}

// Handle HITL resolution continuation
if (event.event === 'RunContinued') {
  clearHITL()
  // Resume normal streaming
}
```

### 2.3 New Components

| File | Description |
|------|-------------|
| `src/components/chat/ChatArea/HITLConfirmationModal.tsx` | Tool execution approval dialog |
| `src/components/chat/ChatArea/HITLInputRequest.tsx` | User input request during execution |
| `src/hooks/useContinueRun.ts` | Mutation to resume paused runs |

**HITLConfirmationModal.tsx:**

```tsx
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, Check, X, Shield } from 'lucide-react'
import { useContinueRun } from '@/hooks/useContinueRun'

interface HITLConfirmationModalProps {
  requirement: {
    tool_call_id: string
    tool_name: string
    tool_args: Record<string, unknown>
  }
  agentId: string
  runId: string
  onResolved: () => void
}

export function HITLConfirmationModal({
  requirement,
  agentId,
  runId,
  onResolved
}: HITLConfirmationModalProps) {
  const { mutate: continueRun, isPending } = useContinueRun()

  const handleConfirm = () => {
    continueRun({
      agentId,
      runId,
      tools: [{
        tool_call_id: requirement.tool_call_id,
        tool_name: requirement.tool_name,
        tool_args: requirement.tool_args,
        confirmed: true
      }]
    }, { onSuccess: onResolved })
  }

  const handleReject = () => {
    continueRun({
      agentId,
      runId,
      tools: [{
        tool_call_id: requirement.tool_call_id,
        tool_name: requirement.tool_name,
        tool_args: requirement.tool_args,
        confirmed: false
      }]
    }, { onSuccess: onResolved })
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Human Approval Required
          </DialogTitle>
          <DialogDescription>
            The agent is requesting permission to execute a sensitive action
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-border/50 p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Tool:</span>
              <code className="px-2 py-0.5 bg-primary/10 rounded text-sm">
                {requirement.tool_name}
              </code>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Arguments:</span>
              <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(requirement.tool_args, null, 2)}
              </pre>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Rejection feedback (optional)
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Explain why you're rejecting this action..."
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isPending}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Reject
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Check className not="h-4 w-4" />
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**useContinueRun.ts:**

> **VALIDATED (2026-01-27)**: Corrected endpoint path and payload structure per Agno docs.

```typescript
import { useMutation } from '@tanstack/react-query'
import { useStore } from '@/store'

interface ToolConfirmation {
  tool_call_id: string
  tool_name: string
  tool_args: Record<string, unknown>
  confirmed: boolean
}

interface ContinueRunParams {
  agentId: string
  runId: string
  tools: ToolConfirmation[]
  sessionId?: string
  userId?: string
}

export function useContinueRun() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)

  return useMutation({
    mutationFn: async (params: ContinueRunParams) => {
      const res = await fetch(
        `${selectedEndpoint}/agents/${params.agentId}/runs/${params.runId}/continue`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { Authorization: `Bearer ${authToken}` })
          },
          body: JSON.stringify({
            tools: params.tools,
            session_id: params.sessionId,
            user_id: params.userId
          })
        }
      )
      if (!res.ok) throw new Error('Failed to continue run')
      return res.json()
    }
  })
}
```

---

## Phase 3: Guardrails Error Handling (P1)

**Timeline:** Sprint 4
**Owner:** TBD

> **VALIDATED (2026-01-27)**: ❌ **ARCHITECTURE CORRECTION REQUIRED**
>
> **Original assumption was WRONG**: The plan assumed guardrails emit `GuardrailTriggered` streaming events.
>
> **Reality**: Agno guardrails are **pre-execution hooks** (`pre_hooks`) that throw `InputCheckError` BEFORE the agent runs. There is NO streaming event for guardrails - the request is blocked with an HTTP error before any SSE stream begins.
>
> **Correct approach**: Handle HTTP 4xx error responses that indicate guardrail violations.

### 3.1 Architecture Change

Guardrails in Agno work as follows:

1. User submits message
2. Guardrail (e.g., `PIIDetectionGuardrail`) runs as a `pre_hook`
3. If triggered, raises `InputCheckError` with `message` and `check_trigger`
4. HTTP response returns error (no SSE stream starts)

### 3.2 Correct Implementation

Instead of inline streaming alerts, handle guardrail errors in the API error response:

**File:** `src/hooks/useAIStreamHandler.tsx` (error handling)

```typescript
// Handle HTTP errors from guardrails (pre-execution blocks)
onError: (error) => {
  if (error.message.includes('InputCheckError') || error.status === 400) {
    // Parse guardrail error details from response
    const guardrailError = parseGuardrailError(error)
    if (guardrailError) {
      setStreamingErrorMessage(
        `🛡️ ${guardrailError.trigger}: ${guardrailError.message}`
      )
      return
    }
  }
  // Handle other errors normally
  updateMessagesWithErrorState()
  setStreamingErrorMessage(error.message)
}
```

### 3.3 Files Changed (Reduced Scope)

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/hooks/useAIStreamHandler.tsx` | Add guardrail error parsing to onError handler |
| NEW | `src/lib/parseGuardrailError.ts` | Parse InputCheckError responses |

**Note:** The `GuardrailAlert.tsx` inline component is NOT needed since guardrails block before streaming starts. Error messages will display in the existing error toast/banner.

---

## Phase 4: Workflows UI Support (P1)

**Timeline:** Sprints 5-6  
**Owner:** TBD

> **Feature Parity:** Agno supports workflows as a third entity type alongside agents and teams.

### 4.1 Store Updates

**File:** `src/store/index.ts`

```typescript
interface WorkflowsSlice {
  workflows: Workflow[]
  selectedWorkflow: Workflow | null
  isWorkflowsLoading: boolean
  workflowsError: string | null
  setWorkflows: (workflows: Workflow[]) => void
  setSelectedWorkflow: (workflow: Workflow | null) => void
}

interface Workflow {
  workflow_id: string
  name: string
  description?: string
  steps: WorkflowStep[]
  created_at: number
  updated_at: number
}

interface WorkflowStep {
  step_id: string
  name: string
  type: 'agent' | 'team' | 'function'
  status?: 'pending' | 'running' | 'completed' | 'failed'
  agent_id?: string
  team_id?: string
  output?: unknown
  started_at?: number
  completed_at?: number
}
```

### 4.2 Mode Selector Update

**File:** `src/components/chat/Sidebar/ModeSelector.tsx`

```tsx
import { Bot, Users, GitBranch } from 'lucide-react'

const MODES = [
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'workflows', label: 'Workflows', icon: GitBranch }
] as const

type Mode = typeof MODES[number]['id']
```

### 4.3 New Components

| File | Description |
|------|-------------|
| `src/components/chat/Sidebar/WorkflowSelector.tsx` | Workflow list/dropdown |
| `src/components/chat/ChatArea/WorkflowProgress.tsx` | Step execution visualization |
| `src/hooks/useWorkflows.ts` | Fetch workflows from API |
| `src/hooks/useWorkflowRun.ts` | Create/monitor workflow runs |

**WorkflowProgress.tsx:**

```tsx
'use client'

import { cn } from '@/lib/utils'
import { Check, Loader2, Circle, AlertCircle, Bot, Users, Code } from 'lucide-react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

interface WorkflowProgressProps {
  steps: Array<{
    step_id: string
    name: string
    type: 'agent' | 'team' | 'function'
    status: 'pending' | 'running' | 'completed' | 'failed'
    output?: string
    duration_ms?: number
  }>
}

const STEP_TYPE_ICONS = {
  agent: Bot,
  team: Users,
  function: Code
}

export function WorkflowProgress({ steps }: WorkflowProgressProps) {
  return (
    <div className="space-y-1">
      {steps.map((step, index) => {
        const TypeIcon = STEP_TYPE_ICONS[step.type]
        const isLast = index === steps.length - 1

        return (
          <div key={step.step_id} className="relative">
            {/* Connector line */}
            {!isLast && (
              <div className={cn(
                'absolute left-4 top-8 w-0.5 h-6 -ml-px',
                step.status === 'completed' ? 'bg-emerald-500' : 'bg-border'
              )} />
            )}

            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors">
                {/* Status indicator */}
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2',
                  step.status === 'completed' && 'border-emerald-500 bg-emerald-500/10',
                  step.status === 'running' && 'border-blue-500 bg-blue-500/10',
                  step.status === 'failed' && 'border-red-500 bg-red-500/10',
                  step.status === 'pending' && 'border-muted-foreground/30'
                )}>
                  {step.status === 'completed' && <Check className="h-4 w-4 text-emerald-500" />}
                  {step.status === 'running' && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
                  {step.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-500" />}
                  {step.status === 'pending' && <Circle className="h-4 w-4 text-muted-foreground/50" />}
                </div>

                {/* Step info */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{step.name}</span>
                    <TypeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  {step.duration_ms && (
                    <span className="text-xs text-muted-foreground">
                      {step.duration_ms}ms
                    </span>
                  )}
                </div>
              </CollapsibleTrigger>

              {step.output && step.status === 'completed' && (
                <CollapsibleContent>
                  <div className="ml-11 p-2 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                    {typeof step.output === 'string' 
                      ? step.output.slice(0, 200) + (step.output.length > 200 ? '...' : '')
                      : JSON.stringify(step.output, null, 2).slice(0, 200)
                    }
                  </div>
                </CollapsibleContent>
              )}
            </Collapsible>
          </div>
        )
      })}
    </div>
  )
}
```

---

## Phase 5: Memory Management Panel (P1)

**Timeline:** Sprints 7-8  
**Owner:** TBD

> **Feature:** Full CRUD UI for agent memories.

### 5.1 New Route

**File:** `src/app/(main)/memory/page.tsx`

```tsx
import { Suspense } from 'react'
import { MemoryTable } from '@/components/memory/MemoryTable'
import { TopicFilter } from '@/components/memory/TopicFilter'
import { MemoryHeader } from '@/components/memory/MemoryHeader'
import { Skeleton } from '@/components/ui/skeleton'

export default function MemoryPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <MemoryHeader />
      
      <div className="flex gap-6">
        <aside className="w-64 shrink-0">
          <TopicFilter />
        </aside>
        
        <main className="flex-1">
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <MemoryTable />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
```

### 5.2 New Components

| File | Description |
|------|-------------|
| `src/components/memory/MemoryTable.tsx` | Data table with columns: Memory, Topics, Source, Updated, Actions |
| `src/components/memory/MemoryEditor.tsx` | Create/edit memory dialog |
| `src/components/memory/TopicFilter.tsx` | Sidebar topic filter |
| `src/components/memory/MemoryHeader.tsx` | Page header with create button |
| `src/hooks/useMemories.ts` | Query hook with topic filtering |

### 5.3 API Integration

**File:** `src/hooks/useMemories.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store'

interface Memory {
  memory_id: string
  memory: string
  topics: string[]
  input: string
  user_id: string
  agent_id: string
  updated_at: number
}

interface MemoryFilters {
  topics?: string[]
  agent_id?: string
  search?: string
}

export function useMemories(filters?: MemoryFilters) {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)

  return useQuery<Memory[]>({
    queryKey: ['memories', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.topics) {
        filters.topics.forEach(t => params.append('topic', t))
      }
      if (filters?.agent_id) {
        params.append('agent_id', filters.agent_id)
      }
      if (filters?.search) {
        params.append('search', filters.search)
      }

      const res = await fetch(
        `${selectedEndpoint}/memories?${params}`,
        { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
      )
      if (!res.ok) throw new Error('Failed to fetch memories')
      return res.json()
    },
    enabled: !!selectedEndpoint
  })
}

export function useCreateMemory() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (memory: { memory: string; topics: string[]; agent_id?: string }) => {
      const res = await fetch(`${selectedEndpoint}/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        body: JSON.stringify(memory)
      })
      if (!res.ok) throw new Error('Failed to create memory')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memories'] })
  })
}

export function useUpdateMemory() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ memoryId, ...data }: { memoryId: string; memory?: string; topics?: string[] }) => {
      const res = await fetch(`${selectedEndpoint}/memories/${memoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Failed to update memory')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memories'] })
  })
}

export function useDeleteMemory() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (memoryId: string) => {
      const res = await fetch(`${selectedEndpoint}/memories/${memoryId}`, {
        method: 'DELETE',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      })
      if (!res.ok) throw new Error('Failed to delete memory')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['memories'] })
  })
}
```

---

## Phase 6: Empty State Onboarding (P1)

**Timeline:** Sprint 8 (parallel with Phase 5)  
**Owner:** TBD

*(Carried over from enterprise enhancement review)*

Enhance empty states with actionable CTAs:

- `PinnedAgents.tsx` - Configure connection CTA
- `RecentSessions.tsx` - Start new chat CTA
- `TeamActivityFeed.tsx` - Explanation of what will appear

---

## Phase 7: Tracing Dashboard (P2)

**Timeline:** Sprints 9-10
**Owner:** TBD

> **Feature:** Debug and analyze agent execution with tree and waterfall views.
>
> **VALIDATED (2026-01-27)**: API endpoints confirmed from Agno OpenAPI specification.

### 7.1 API Endpoints (Verified)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/traces` | GET | List traces with filtering (run_id, session_id, user_id, agent_id, status, time range) |
| `/traces/{trace_id}` | GET | Get trace detail with hierarchical span tree |
| `/traces/{trace_id}?span_id={id}` | GET | Get specific span within trace |

**Trace Query Parameters:**

- `run_id`, `session_id`, `user_id`, `agent_id` - Filter by context
- `status` - Filter by OK, ERROR
- `start_time`, `end_time` - Time range filtering (ISO 8601)
- `page`, `limit` - Pagination (1-indexed)

**Response Schema (TraceSummary):**

```typescript
interface TraceSummary {
  trace_id: string
  name: string           // Root span name (e.g., "Stock_Price_Agent.run")
  status: 'OK' | 'ERROR' | 'UNSET'
  duration: string       // Human-readable (e.g., "1.2s")
  start_time: string     // ISO 8601
  end_time: string       // ISO 8601
  total_spans: number
  error_count: number
  input?: string
  run_id?: string
  session_id?: string
  user_id?: string
  agent_id?: string
}
```

**TraceDetail Response (with hierarchy):**

```typescript
interface TraceDetail extends TraceSummary {
  output?: string
  error?: string
  tree: SpanNode[]  // Hierarchical span tree
}

interface SpanNode {
  span_id: string
  name: string
  type: 'AGENT' | 'LLM' | 'TOOL'
  status: string
  duration: string
  start_time: string
  end_time: string
  children?: SpanNode[]
  // Type-specific attributes
  model?: string        // LLM spans
  input_tokens?: number
  output_tokens?: number
  tool_params?: object  // TOOL spans
  tool_result?: string
}
```

### 7.2 New Route

**File:** `src/app/(main)/tracing/page.tsx`

### 7.3 New Components

| File | Description |
|------|-------------|
| `src/components/tracing/TraceList.tsx` | Filterable list of traces |
| `src/components/tracing/TreeView.tsx` | Hierarchical span display |
| `src/components/tracing/WaterfallView.tsx` | Time-axis visualization |
| `src/components/tracing/SpanDetails.tsx` | Per-span details panel |
| `src/components/tracing/TimeRangeFilter.tsx` | Preset + custom date range |

### 7.4 Hooks

**File:** `src/hooks/useTraces.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/store'

interface TraceFilters {
  run_id?: string
  session_id?: string
  user_id?: string
  agent_id?: string
  status?: 'OK' | 'ERROR'
  start_time?: string  // ISO 8601
  end_time?: string    // ISO 8601
  page?: number
  limit?: number
}

export function useTraces(filters?: TraceFilters) {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)

  return useQuery({
    queryKey: ['traces', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.run_id) params.append('run_id', filters.run_id)
      if (filters?.session_id) params.append('session_id', filters.session_id)
      if (filters?.user_id) params.append('user_id', filters.user_id)
      if (filters?.agent_id) params.append('agent_id', filters.agent_id)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.start_time) params.append('start_time', filters.start_time)
      if (filters?.end_time) params.append('end_time', filters.end_time)
      if (filters?.page) params.append('page', String(filters.page))
      if (filters?.limit) params.append('limit', String(filters.limit))

      const res = await fetch(
        `${selectedEndpoint}/traces?${params}`,
        { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
      )
      if (!res.ok) throw new Error('Failed to fetch traces')
      return res.json()
    },
    enabled: !!selectedEndpoint
  })
}

export function useTraceDetails(traceId: string, spanId?: string) {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)

  return useQuery({
    queryKey: ['trace', traceId, spanId],
    queryFn: async () => {
      const params = spanId ? `?span_id=${spanId}` : ''
      const res = await fetch(
        `${selectedEndpoint}/traces/${traceId}${params}`,
        { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
      )
      if (!res.ok) throw new Error('Failed to fetch trace details')
      return res.json()
    },
    enabled: !!selectedEndpoint && !!traceId
  })
}
```

---

## Phase 8: Evals Dashboard (P2)

**Timeline:** Sprint 11
**Owner:** TBD

> **Feature:** Visualize agent evaluation results (accuracy, performance, reliability).
>
> **VALIDATED (2026-01-27)**: API endpoints confirmed from Agno OpenAPI specification.

### 8.1 API Endpoints (Verified)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/eval-runs` | GET | List evaluation runs with filtering |
| `/eval-runs` | POST | Execute a new evaluation |
| `/eval-runs/{eval_run_id}` | GET | Get detailed results for an eval run |

**Eval Query Parameters:**

- `agent_id`, `team_id`, `workflow_id` - Filter by evaluated component
- `model_id`, `model_provider` - Filter by model used
- `eval_type` - Filter by type (accuracy, agent_as_judge, performance, reliability)
- `page`, `limit` - Pagination

**EvalRunInput (POST body):**

```typescript
interface EvalRunInput {
  agent_id?: string         // Evaluate an agent (exclusive with team_id)
  team_id?: string          // Evaluate a team (exclusive with agent_id)
  model_id?: string         // Model to use for evaluation
  model_provider?: string
  eval_type: 'accuracy' | 'agent_as_judge' | 'performance' | 'reliability'
  input: string             // Input text/query for evaluation
  expected_output?: string  // For accuracy evals
  additional_guidelines?: string
  additional_context?: string
  num_iterations?: number   // 1-100, default 1
  name?: string             // Name for this eval run
}
```

**EvalSchema (Response):**

```typescript
interface EvalSchema {
  id: string
  agent_id?: string
  team_id?: string
  workflow_id?: string
  model_id?: string
  model_provider?: string
  name?: string
  evaluated_component_name?: string
  eval_type: 'accuracy' | 'agent_as_judge' | 'performance' | 'reliability'
  eval_data: Record<string, unknown>  // Evaluation results and metrics
  eval_input?: Record<string, unknown>
  created_at: string
  updated_at: string
}
```

### 8.2 New Route

**File:** `src/app/(main)/evals/page.tsx`

### 8.3 New Components

| File | Description |
|------|-------------|
| `src/components/evals/EvalsList.tsx` | List of evaluation runs |
| `src/components/evals/AccuracyChart.tsx` | LLM-as-judge scores visualization |
| `src/components/evals/PerformanceMetrics.tsx` | Latency/memory charts |
| `src/components/evals/ReliabilityTable.tsx` | Tool call success rates |
| `src/components/evals/RunEvalDialog.tsx` | Dialog to execute new evals |

### 8.4 Hooks

**File:** `src/hooks/useEvals.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store'

interface EvalFilters {
  agent_id?: string
  team_id?: string
  workflow_id?: string
  eval_type?: 'accuracy' | 'agent_as_judge' | 'performance' | 'reliability'
  page?: number
  limit?: number
}

export function useEvals(filters?: EvalFilters) {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)

  return useQuery({
    queryKey: ['evals', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.agent_id) params.append('agent_id', filters.agent_id)
      if (filters?.team_id) params.append('team_id', filters.team_id)
      if (filters?.workflow_id) params.append('workflow_id', filters.workflow_id)
      if (filters?.eval_type) params.append('eval_type', filters.eval_type)
      if (filters?.page) params.append('page', String(filters.page))
      if (filters?.limit) params.append('limit', String(filters.limit))

      const res = await fetch(
        `${selectedEndpoint}/eval-runs?${params}`,
        { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
      )
      if (!res.ok) throw new Error('Failed to fetch evals')
      return res.json()
    },
    enabled: !!selectedEndpoint
  })
}

export function useEvalDetails(evalRunId: string) {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)

  return useQuery({
    queryKey: ['eval', evalRunId],
    queryFn: async () => {
      const res = await fetch(
        `${selectedEndpoint}/eval-runs/${evalRunId}`,
        { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }
      )
      if (!res.ok) throw new Error('Failed to fetch eval details')
      return res.json()
    },
    enabled: !!selectedEndpoint && !!evalRunId
  })
}

export function useRunEval() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      agent_id?: string
      team_id?: string
      eval_type: 'accuracy' | 'agent_as_judge' | 'performance' | 'reliability'
      input: string
      expected_output?: string
      num_iterations?: number
      name?: string
    }) => {
      const res = await fetch(`${selectedEndpoint}/eval-runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` })
        },
        body: JSON.stringify(input)
      })
      if (!res.ok) throw new Error('Failed to run evaluation')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['evals'] })
  })
}
```

---

## Phase 9: Knowledge Explorer Enhancement (P2)

**Timeline:** Sprint 12  
**Owner:** TBD

> **Feature:** Enhance existing knowledge list with search and chunk viewing.

**Codebase Status:**

- Knowledge API routes exist in `src/api/routes.ts`
- Basic list exists at `/knowledge`
- Missing: Search, chunk visualization

### 9.1 Enhancements

| Action | File | Description |
|--------|------|-------------|
| MODIFY | `src/components/knowledge/KnowledgeBaseList.tsx` | Add doc counts, status badges |
| NEW | `src/components/knowledge/KnowledgeSearch.tsx` | Hybrid search interface |
| NEW | `src/components/knowledge/ChunkViewer.tsx` | Document chunk visualization |

---

## Phase 10: Polish & Long-Term (P3)

**Timeline:** Sprints 13-16  
**Owner:** TBD

### 10.1 Team Delegation Visualization

Show which agent handles each part of a team request.

| File | Description |
|------|-------------|
| NEW | `src/components/chat/ChatArea/TeamDelegationFlow.tsx` | Delegation steps display |

### 10.2 Reasoning Trace Enhancement

Expand `ReasoningSteps` display with confidence scores and collapsible structure.

### 10.3 Reference/Context Display

Show knowledge base sources inline after agent messages.

| File | Description |
|------|-------------|
| NEW | `src/components/chat/ChatArea/ReferenceList.tsx` | Inline source citations |

### 10.4 Structured Output Rendering

Auto-detect and render JSON schema outputs as tables/trees.

### 10.5 Settings Consolidation

Merge settings from sidebar into unified Settings Hub.

### 10.6 White-Labeling & Branding

Environment-based branding configuration.

### 10.7 Navigation Consistency

Unified NavigationShell component.

### 10.8 Accessibility

- Keyboard navigation audit
- ARIA labels
- Motion preferences

---

## File Summary

### New Files (31 total)

| Phase | Files |
|-------|-------|
| 1 | `useCancelRun.ts` |
| 2 | `HITLConfirmationModal.tsx`, `HITLInputRequest.tsx`, `useContinueRun.ts` |
| 3 | `GuardrailAlert.tsx` |
| 4 | `WorkflowSelector.tsx`, `WorkflowProgress.tsx`, `useWorkflows.ts`, `useWorkflowRun.ts` |
| 5 | `memory/page.tsx`, `MemoryTable.tsx`, `MemoryEditor.tsx`, `TopicFilter.tsx`, `MemoryHeader.tsx`, `useMemories.ts` |
| 7 | `tracing/page.tsx`, `TraceList.tsx`, `TreeView.tsx`, `WaterfallView.tsx`, `SpanDetails.tsx`, `TimeRangeFilter.tsx`, `useTraces.ts`, `useTraceDetails.ts` |
| 8 | `evals/page.tsx`, `EvalsList.tsx`, `AccuracyChart.tsx`, `PerformanceMetrics.tsx`, `ReliabilityTable.tsx`, `useEvals.ts` |
| 9 | `KnowledgeSearch.tsx`, `ChunkViewer.tsx` |

### Modified Files (12 total)

| File | Phases |
|------|--------|
| `ChatInput.tsx` | 1 |
| `SessionItem.tsx` | 1 |
| `UsageStats.tsx` | 1 |
| `AdminMetrics.tsx` | 1 |
| `store/index.ts` | 1, 2, 4 |
| `useAIStreamHandler.tsx` | 2, 3 |
| `ModeSelector.tsx` | 4 |
| `MessageItem.tsx` | 3, 10 |
| `KnowledgeBaseList.tsx` | 9 |

---

## API Endpoints Required

| Feature | Endpoint | UI Status | Backend Status |
|---------|----------|-----------|----------------|
| Run Cancel | `POST /agents/{id}/runs/{id}/cancel` | No UI trigger | ✅ Backend exists |
| HITL Continue | `POST /agents/{id}/runs/{id}/continue` | No handler | ✅ Backend exists |
| Workflows | `GET /workflows`, `POST /workflows/{id}/runs` | No routes | ✅ Backend exists |
| Memory CRUD | `GET/POST/PUT/DELETE /memories` | No routes | ✅ Backend exists |
| Tracing | `GET /traces`, `GET /traces/{id}` | No routes | ✅ Backend verified |
| Evals | `GET/POST /eval-runs`, `GET /eval-runs/{id}` | No routes | ✅ Backend verified |
| Knowledge | `/knowledge/*` | Routes exist | ✅ Backend exists |
| Guardrails | N/A (pre-hook errors) | Error handling only | ✅ Backend exists |

---

## Verification Checklist

### Phase 1

- [ ] Stop button appears during streaming
- [ ] Clicking stop cancels the run
- [ ] Session list shows token counts
- [ ] Dashboard refresh shows toast

### Phase 2

- [ ] HITL modal appears for `RunPaused` events
- [ ] Approve button continues execution
- [ ] Reject button stops with feedback
- [ ] User input modal appears when required

### Phase 3

- [ ] Guardrail errors display in error toast/banner
- [ ] Error message includes guardrail type (PII, injection, etc.)

### Phase 4

- [ ] Workflows tab visible in ModeSelector
- [ ] Workflow list loads from API
- [ ] Step progress updates during execution

### Phase 5

- [ ] Memory page loads at `/memory`
- [ ] Memories display in table
- [ ] Create/edit/delete operations work
- [ ] Topic filtering works

### Phase 7

- [ ] Tracing page loads at `/tracing`
- [ ] Tree view shows span hierarchy
- [ ] Waterfall view shows timing
- [ ] Date filtering works

### Phase 8

- [ ] Evals page loads at `/evals`
- [ ] Accuracy charts render
- [ ] Performance metrics display

---

## Dependencies

### Required Packages (already installed)

- `@tanstack/react-query` - Data fetching
- `lucide-react` - Icons
- `zustand` - State management
- Radix UI primitives - Dialogs, Collapsibles, etc.

### Potential New Dependencies

- `recharts` or `@visx/visx` - Charts for tracing/evals (evaluate during Phase 7)
- `date-fns` - Date formatting (already available)

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Backend API changes | Lock API contract early, add TypeScript types |
| Complex SSE event handling for HITL | Comprehensive testing with mock events |
| Performance with large trace data | Implement pagination, virtualized lists |
| Workflow execution complexity | Start with simple sequential workflows |

---

## Open Questions

1. **HITL external execution:** Do we need to support `is_external_tool_execution` requirement type in v1?
2. **Evals charting library:** Should we use recharts (already common) or a more specialized library?
3. **Memory pagination:** Should we implement infinite scroll or traditional pagination?
4. **Tracing retention:** What's the default time range for trace queries?

---

*Plan created: 2026-01-27*  
*Based on: Agno Documentation Analysis + Codebase Validation*
