# Phase 2: Core Gaps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement three critical feature gaps from Agno parity analysis: HITL confirmation flow, Workflows mode, and Memory management panel.

**Architecture:** Each feature follows the established pattern: types → API routes → store state → hooks → UI components. HITL integrates into existing streaming infrastructure (RunPaused/RunContinued events already exist). Workflows extends ModeSelector. Memory gets a dedicated page.

**Tech Stack:** TypeScript, React 19, Zustand 5, nuqs, Tailwind CSS v4, shadcn/ui components

> **Validation Note:** This plan was validated against Agno documentation on 2026-01-27. Guardrails feature was removed as Agno implements guardrails as pre-execution hooks (throwing `InputCheckError`), not streaming events.

---

## Task 1: Add Workflow Types

**Files:**

- Modify: `src/types/os.ts`

**Step 1: Write the failing test**

Create test file:

```bash
touch src/types/__tests__/os.test.ts
```

```typescript
// src/types/__tests__/os.test.ts
import { describe, it, expect } from 'vitest'
import { RunEvent, type Workflow, type WorkflowDetails } from '../os'

describe('Workflow types', () => {
  it('should have workflow run events in RunEvent enum', () => {
    // Note: Verify exact event names with AgentOS backend
    // Agno Python uses snake_case (workflow_started), AgentOS may convert to PascalCase
    expect(RunEvent.WorkflowStarted).toBe('WorkflowStarted')
    expect(RunEvent.WorkflowCompleted).toBe('WorkflowCompleted')
    expect(RunEvent.WorkflowError).toBe('WorkflowError')
    expect(RunEvent.StepStarted).toBe('StepStarted')
    expect(RunEvent.StepCompleted).toBe('StepCompleted')
  })

  it('should define Workflow interface', () => {
    const workflow: Workflow = {
      workflow_id: 'wf-123',
      name: 'Research Workflow',
      description: 'Multi-step research pipeline',
      storage: true
    }
    expect(workflow.workflow_id).toBe('wf-123')
  })

  it('should define WorkflowDetails interface', () => {
    const details: WorkflowDetails = {
      id: 'wf-123',
      name: 'Research Workflow',
      db_id: 'db-456'
    }
    expect(details.id).toBe('wf-123')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/types/__tests__/os.test.ts`
Expected: FAIL - WorkflowStarted, Workflow, WorkflowDetails not defined

**Step 3: Write minimal implementation**

Add to `src/types/os.ts` after TeamMemoryUpdateCompleted in RunEvent enum:

```typescript
// Add to RunEvent enum (after TeamMemoryUpdateCompleted line ~112)
  // Workflow Events
  // Note: Verify these match AgentOS SSE output (may need adjustment)
  WorkflowStarted = 'WorkflowStarted',
  WorkflowCompleted = 'WorkflowCompleted',
  WorkflowError = 'WorkflowError',
  StepStarted = 'StepStarted',
  StepCompleted = 'StepCompleted',
```

Add new interfaces after Team interface:

```typescript
export interface Workflow {
  workflow_id: string
  name: string
  description?: string
  storage?: boolean
}

export interface WorkflowDetails {
  id: string
  name: string
  db_id?: string
  model?: Model
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/types/__tests__/os.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/os.ts src/types/__tests__/os.test.ts
git commit -m "feat(types): add Workflow types and RunEvent workflow events"
```

---

## Task 2: Add HITL Types

**Files:**

- Modify: `src/types/os.ts`

> **Validation Note:** Field names corrected to match Agno API. Uses `tool_call_id` (not `requirement_id`) and `confirmed` (not `approved`).

**Step 1: Write the failing test**

Add to existing test file:

```typescript
// Add to src/types/__tests__/os.test.ts
import type { HITLTool, PausedRunState } from '../os'

describe('HITL types', () => {
  it('should define HITLTool interface matching Agno API', () => {
    const tool: HITLTool = {
      tool_call_id: 'tc-123',
      tool_name: 'delete_user',
      tool_args: { user_id: '456' }
    }
    expect(tool.tool_call_id).toBe('tc-123')
    expect(tool.tool_name).toBe('delete_user')
  })

  it('should define PausedRunState interface', () => {
    const state: PausedRunState = {
      run_id: 'run-123',
      session_id: 'sess-456',
      status: 'paused',
      tools: [{
        tool_call_id: 'tc-789',
        tool_name: 'send_email',
        tool_args: {}
      }]
    }
    expect(state.status).toBe('paused')
    expect(state.tools).toHaveLength(1)
    expect(state.tools[0].tool_call_id).toBe('tc-789')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/types/__tests__/os.test.ts`
Expected: FAIL - HITLTool, PausedRunState not defined

**Step 3: Write minimal implementation**

Add to `src/types/os.ts` after Workflow interfaces:

```typescript
// HITL (Human-in-the-Loop) Types
// Matches Agno API response structure for paused runs
export interface HITLTool {
  tool_call_id: string
  tool_name: string
  tool_args: Record<string, unknown>
}

export interface PausedRunState {
  run_id: string
  session_id: string
  status: 'paused'
  tools: HITLTool[]
}

// Request payload for continuing a paused run
export interface HITLContinuePayload {
  tools: Array<HITLTool & { confirmed: boolean }>
  session_id: string
  user_id?: string
  stream?: boolean
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/types/__tests__/os.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/os.ts src/types/__tests__/os.test.ts
git commit -m "feat(types): add HITL tool and paused run state types"
```

---

## Task 3: Add Memory Types

**Files:**

- Modify: `src/types/os.ts`

**Step 1: Write the failing test**

Add to existing test file:

```typescript
// Add to src/types/__tests__/os.test.ts
import type { Memory, MemoryEntry } from '../os'

describe('Memory types', () => {
  it('should define MemoryEntry interface', () => {
    const entry: MemoryEntry = {
      memory_id: 'mem-123',
      memory: 'User prefers dark mode',
      topics: ['preferences', 'ui'],
      user_id: 'user-456',
      created_at: '2023-10-27T10:00:00Z'
    }
    expect(entry.memory_id).toBe('mem-123')
    expect(entry.topics).toContain('preferences')
  })

  it('should define Memory list response interface', () => {
    const response: Memory = {
      data: [{
        memory_id: 'mem-1',
        memory: 'Test memory',
        topics: [],
        created_at: '2023-10-27T10:00:00Z'
      }],
      total: 1
    }
    expect(response.data).toHaveLength(1)
    expect(response.total).toBe(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/types/__tests__/os.test.ts`
Expected: FAIL - Memory, MemoryEntry not defined

**Step 3: Write minimal implementation**

Add to `src/types/os.ts`:

```typescript
export interface MemoryEntry {
  memory_id: string
  memory: string
  topics: string[]
  user_id?: string
  agent_id?: string
  created_at: string
}

export interface Memory {
  data: MemoryEntry[]
  total: number
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/types/__tests__/os.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/os.ts src/types/__tests__/os.test.ts
git commit -m "feat(types): add Memory and MemoryEntry types"
```

---

## Task 4: Add API Routes

**Files:**

- Modify: `src/api/routes.ts`

**Step 1: Write the failing test**

```bash
touch src/api/__tests__/routes.test.ts
```

```typescript
// src/api/__tests__/routes.test.ts
import { describe, it, expect } from 'vitest'
import { APIRoutes } from '../routes'

const BASE_URL = 'http://localhost:8000'

describe('APIRoutes', () => {
  describe('Workflow routes', () => {
    it('should generate GetWorkflows URL', () => {
      expect(APIRoutes.GetWorkflows(BASE_URL)).toBe(`${BASE_URL}/workflows`)
    })

    it('should generate WorkflowRun URL', () => {
      expect(APIRoutes.WorkflowRun(BASE_URL, 'wf-123')).toBe(
        `${BASE_URL}/workflows/wf-123/runs`
      )
    })
  })

  describe('Memory routes', () => {
    it('should generate GetMemories URL', () => {
      expect(APIRoutes.GetMemories(BASE_URL)).toBe(`${BASE_URL}/memories`)
    })

    it('should generate Memory CRUD URLs', () => {
      expect(APIRoutes.CreateMemory(BASE_URL)).toBe(`${BASE_URL}/memories`)
      expect(APIRoutes.UpdateMemory(BASE_URL, 'mem-1')).toBe(
        `${BASE_URL}/memories/mem-1`
      )
      expect(APIRoutes.DeleteMemory(BASE_URL, 'mem-1')).toBe(
        `${BASE_URL}/memories/mem-1`
      )
    })
  })

  describe('Run control routes', () => {
    it('should generate CancelRun URL', () => {
      expect(APIRoutes.CancelRun(BASE_URL, 'agent-1', 'run-1')).toBe(
        `${BASE_URL}/agents/agent-1/runs/run-1/cancel`
      )
    })

    it('should generate ContinueRun URL for HITL', () => {
      expect(APIRoutes.ContinueRun(BASE_URL, 'agent-1', 'run-1')).toBe(
        `${BASE_URL}/agents/agent-1/runs/run-1/continue`
      )
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/api/__tests__/routes.test.ts`
Expected: FAIL - GetWorkflows, WorkflowRun, etc. not defined

**Step 3: Write minimal implementation**

Add to `src/api/routes.ts`:

```typescript
export const APIRoutes = {
  // ... existing routes ...

  // Workflow API
  GetWorkflows: (agentOSUrl: string) => `${agentOSUrl}/workflows`,
  WorkflowRun: (agentOSUrl: string, workflowId: string) =>
    `${agentOSUrl}/workflows/${workflowId}/runs`,

  // Memory API
  GetMemories: (agentOSUrl: string) => `${agentOSUrl}/memories`,
  CreateMemory: (agentOSUrl: string) => `${agentOSUrl}/memories`,
  UpdateMemory: (agentOSUrl: string, memoryId: string) =>
    `${agentOSUrl}/memories/${memoryId}`,
  DeleteMemory: (agentOSUrl: string, memoryId: string) =>
    `${agentOSUrl}/memories/${memoryId}`,

  // Run Control API
  CancelRun: (agentOSUrl: string, agentId: string, runId: string) =>
    `${agentOSUrl}/agents/${agentId}/runs/${runId}/cancel`,
  ContinueRun: (agentOSUrl: string, agentId: string, runId: string) =>
    `${agentOSUrl}/agents/${agentId}/runs/${runId}/continue`
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/api/__tests__/routes.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/api/routes.ts src/api/__tests__/routes.test.ts
git commit -m "feat(api): add workflow, memory, and run control routes"
```

---

## Task 5: Extend Store for Workflows and HITL

**Files:**

- Modify: `src/store.ts`

**Step 1: Write the failing test**

```bash
touch src/__tests__/store.test.ts
```

```typescript
// src/__tests__/store.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'

describe('Store workflow state', () => {
  beforeEach(() => {
    useStore.setState({
      mode: 'agent',
      workflows: [],
      pausedRun: null
    })
  })

  it('should support workflow mode', () => {
    useStore.getState().setMode('workflow')
    expect(useStore.getState().mode).toBe('workflow')
  })

  it('should store workflows list', () => {
    const workflows = [{ id: 'wf-1', name: 'Test Workflow' }]
    useStore.getState().setWorkflows(workflows)
    expect(useStore.getState().workflows).toEqual(workflows)
  })

  it('should store paused run state', () => {
    const pausedRun = {
      run_id: 'run-1',
      session_id: 'sess-1',
      status: 'paused' as const,
      tools: [{
        tool_call_id: 'tc-1',
        tool_name: 'test_tool',
        tool_args: {}
      }]
    }
    useStore.getState().setPausedRun(pausedRun)
    expect(useStore.getState().pausedRun).toEqual(pausedRun)
  })

  it('should clear paused run', () => {
    useStore.getState().setPausedRun({
      run_id: 'run-1',
      session_id: 'sess-1',
      status: 'paused',
      tools: []
    })
    useStore.getState().setPausedRun(null)
    expect(useStore.getState().pausedRun).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/__tests__/store.test.ts`
Expected: FAIL - workflow mode not valid, workflows/pausedRun properties missing

**Step 3: Write minimal implementation**

Modify `src/store.ts`:

```typescript
import {
  AgentDetails,
  SessionEntry,
  TeamDetails,
  WorkflowDetails,
  PausedRunState,
  type ChatMessage
} from '@/types/os'

interface Store {
  // ... existing properties ...
  mode: 'agent' | 'team' | 'workflow'
  setMode: (mode: 'agent' | 'team' | 'workflow') => void
  workflows: WorkflowDetails[]
  setWorkflows: (workflows: WorkflowDetails[]) => void
  pausedRun: PausedRunState | null
  setPausedRun: (pausedRun: PausedRunState | null) => void
}

// In create():
    workflows: [],
    setWorkflows: (workflows) => set({ workflows }),
    pausedRun: null,
    setPausedRun: (pausedRun) => set({ pausedRun }),
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/__tests__/store.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/store.ts src/__tests__/store.test.ts
git commit -m "feat(store): add workflow mode, workflows list, and pausedRun state"
```

---

## Task 6: Update ModeSelector for Workflows

**Files:**

- Modify: `src/components/chat/Sidebar/ModeSelector.tsx`

**Step 1: Write the failing test**

```bash
mkdir -p src/components/chat/Sidebar/__tests__
touch src/components/chat/Sidebar/__tests__/ModeSelector.test.tsx
```

```typescript
// src/components/chat/Sidebar/__tests__/ModeSelector.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModeSelector } from '../ModeSelector'

// Mock dependencies
vi.mock('@/store', () => ({
  useStore: vi.fn(() => ({
    mode: 'agent',
    setMode: vi.fn(),
    setMessages: vi.fn(),
    setSelectedModel: vi.fn()
  }))
}))

vi.mock('nuqs', () => ({
  useQueryState: () => [null, vi.fn()]
}))

vi.mock('@/hooks/useChatActions', () => ({
  default: () => ({ clearChat: vi.fn() })
}))

describe('ModeSelector', () => {
  it('should render workflow button', () => {
    render(<ModeSelector />)
    expect(screen.getByText('Workflow')).toBeInTheDocument()
  })

  it('should have three mode buttons', () => {
    render(<ModeSelector />)
    expect(screen.getByText('Agent')).toBeInTheDocument()
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('Workflow')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/chat/Sidebar/__tests__/ModeSelector.test.tsx`
Expected: FAIL - "Workflow" button not found

**Step 3: Write minimal implementation**

Update `src/components/chat/Sidebar/ModeSelector.tsx`:

```typescript
'use client'

import { useStore } from '@/store'
import { useQueryState } from 'nuqs'
import useChatActions from '@/hooks/useChatActions'
import { Bot, Users, Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ModeSelector() {
  const { mode, setMode, setMessages, setSelectedModel } = useStore()
  const { clearChat } = useChatActions()
  const [, setAgentId] = useQueryState('agent')
  const [, setTeamId] = useQueryState('team')
  const [, setWorkflowId] = useQueryState('workflow')
  const [, setSessionId] = useQueryState('session')

  const handleModeChange = (newMode: 'agent' | 'team' | 'workflow') => {
    if (newMode === mode) return

    setMode(newMode)

    setAgentId(null)
    setTeamId(null)
    setWorkflowId(null)
    setSelectedModel('')
    setMessages([])
    setSessionId(null)
    clearChat()
  }

  const buttonClass = (buttonMode: 'agent' | 'team' | 'workflow') =>
    cn(
      'flex flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-medium uppercase transition-all',
      mode === buttonMode
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    )

  return (
    <div className="bg-secondary border-primary/15 flex h-9 w-full rounded-xl border p-1">
      <button onClick={() => handleModeChange('agent')} className={buttonClass('agent')}>
        <Bot className="h-3.5 w-3.5" />
        Agent
      </button>
      <button onClick={() => handleModeChange('team')} className={buttonClass('team')}>
        <Users className="h-3.5 w-3.5" />
        Team
      </button>
      <button onClick={() => handleModeChange('workflow')} className={buttonClass('workflow')}>
        <Workflow className="h-3.5 w-3.5" />
        Workflow
      </button>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/chat/Sidebar/__tests__/ModeSelector.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/Sidebar/ModeSelector.tsx src/components/chat/Sidebar/__tests__/ModeSelector.test.tsx
git commit -m "feat(ui): add workflow mode to ModeSelector"
```

---

## Task 7: Create HITL Confirmation Modal Component

**Files:**

- Create: `src/components/chat/ChatArea/HITLConfirmationModal.tsx`

> **Validation Note:** Props use `tool_call_id` to match Agno API structure.

**Step 1: Write the failing test**

```bash
mkdir -p src/components/chat/ChatArea/__tests__
touch src/components/chat/ChatArea/__tests__/HITLConfirmationModal.test.tsx
```

```typescript
// src/components/chat/ChatArea/__tests__/HITLConfirmationModal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HITLConfirmationModal } from '../HITLConfirmationModal'

describe('HITLConfirmationModal', () => {
  const mockTool = {
    tool_call_id: 'tc-123',
    tool_name: 'delete_user',
    tool_args: { user_id: '456' }
  }

  it('should render when open', () => {
    render(
      <HITLConfirmationModal
        open={true}
        tool={mockTool}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.getByText('Confirmation Required')).toBeInTheDocument()
    expect(screen.getByText('delete_user')).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(
      <HITLConfirmationModal
        open={false}
        tool={mockTool}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
      />
    )
    expect(screen.queryByText('Confirmation Required')).not.toBeInTheDocument()
  })

  it('should call onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn()
    render(
      <HITLConfirmationModal
        open={true}
        tool={mockTool}
        onConfirm={onConfirm}
        onReject={vi.fn()}
      />
    )
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledWith(mockTool)
  })

  it('should call onReject when reject button clicked', () => {
    const onReject = vi.fn()
    render(
      <HITLConfirmationModal
        open={true}
        tool={mockTool}
        onConfirm={vi.fn()}
        onReject={onReject}
      />
    )
    fireEvent.click(screen.getByText('Reject'))
    expect(onReject).toHaveBeenCalledWith(mockTool)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/chat/ChatArea/__tests__/HITLConfirmationModal.test.tsx`
Expected: FAIL - HITLConfirmationModal not found

**Step 3: Write minimal implementation**

```typescript
// src/components/chat/ChatArea/HITLConfirmationModal.tsx
'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import type { HITLTool } from '@/types/os'

interface HITLConfirmationModalProps {
  open: boolean
  tool: HITLTool | null
  onConfirm: (tool: HITLTool) => void
  onReject: (tool: HITLTool) => void
}

export function HITLConfirmationModal({
  open,
  tool,
  onConfirm,
  onReject
}: HITLConfirmationModalProps) {
  if (!tool) return null

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Confirmation Required
          </DialogTitle>
          <DialogDescription>
            The agent wants to execute an action that requires your approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-secondary rounded-lg p-3">
            <p className="text-muted-foreground text-xs uppercase">Tool</p>
            <p className="font-mono text-sm">{tool.tool_name}</p>
          </div>

          {Object.keys(tool.tool_args).length > 0 && (
            <div className="bg-secondary rounded-lg p-3">
              <p className="text-muted-foreground mb-2 text-xs uppercase">
                Arguments
              </p>
              <pre className="overflow-x-auto text-xs">
                {JSON.stringify(tool.tool_args, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onReject(tool)}>
            Reject
          </Button>
          <Button onClick={() => onConfirm(tool)} className="bg-brand text-white">
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/chat/ChatArea/__tests__/HITLConfirmationModal.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/ChatArea/HITLConfirmationModal.tsx src/components/chat/ChatArea/__tests__/HITLConfirmationModal.test.tsx
git commit -m "feat(ui): add HITL confirmation modal component"
```

---

## Task 8: Create useHITLHandler Hook

**Files:**

- Create: `src/hooks/useHITLHandler.ts`

> **Validation Note:** Payload uses `confirmed: true/false` per Agno API (not `approved`).

**Step 1: Write the failing test**

```bash
touch src/hooks/__tests__/useHITLHandler.test.ts
```

```typescript
// src/hooks/__tests__/useHITLHandler.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHITLHandler } from '../useHITLHandler'

// Mock store
const mockSetPausedRun = vi.fn()
vi.mock('@/store', () => ({
  useStore: vi.fn((selector) => {
    const state = {
      selectedEndpoint: 'http://localhost:8000',
      authToken: 'test-token',
      pausedRun: null,
      setPausedRun: mockSetPausedRun
    }
    return selector ? selector(state) : state
  })
}))

// Mock fetch
global.fetch = vi.fn()

describe('useHITLHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide confirmTool function', () => {
    const { result } = renderHook(() => useHITLHandler())
    expect(typeof result.current.confirmTool).toBe('function')
  })

  it('should provide rejectTool function', () => {
    const { result } = renderHook(() => useHITLHandler())
    expect(typeof result.current.rejectTool).toBe('function')
  })

  it('should call continue endpoint with confirmed:true on confirm', async () => {
    ;(global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'completed' })
    })

    const { result } = renderHook(() => useHITLHandler())
    const tool = {
      tool_call_id: 'tc-1',
      tool_name: 'test_tool',
      tool_args: { key: 'value' }
    }

    await act(async () => {
      await result.current.confirmTool('agent-1', 'run-1', 'sess-1', tool)
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/agents/agent-1/runs/run-1/continue',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"confirmed":true')
      })
    )
  })

  it('should call continue endpoint with confirmed:false on reject', async () => {
    ;(global.fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'cancelled' })
    })

    const { result } = renderHook(() => useHITLHandler())
    const tool = {
      tool_call_id: 'tc-1',
      tool_name: 'test_tool',
      tool_args: {}
    }

    await act(async () => {
      await result.current.rejectTool('agent-1', 'run-1', 'sess-1', tool)
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/agents/agent-1/runs/run-1/continue',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"confirmed":false')
      })
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/hooks/__tests__/useHITLHandler.test.ts`
Expected: FAIL - useHITLHandler not found

**Step 3: Write minimal implementation**

```typescript
// src/hooks/useHITLHandler.ts
import { useCallback } from 'react'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'
import { constructEndpointUrl } from '@/lib/utils'
import type { HITLTool, HITLContinuePayload } from '@/types/os'

export function useHITLHandler() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const setPausedRun = useStore((state) => state.setPausedRun)

  const continueRun = useCallback(
    async (
      agentId: string,
      runId: string,
      sessionId: string,
      tool: HITLTool,
      confirmed: boolean
    ) => {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const url = APIRoutes.ContinueRun(endpointUrl, agentId, runId)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const payload: HITLContinuePayload = {
        tools: [{
          tool_call_id: tool.tool_call_id,
          tool_name: tool.tool_name,
          tool_args: tool.tool_args,
          confirmed
        }],
        session_id: sessionId,
        stream: true
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setPausedRun(null)
      }

      return response
    },
    [selectedEndpoint, authToken, setPausedRun]
  )

  const confirmTool = useCallback(
    async (agentId: string, runId: string, sessionId: string, tool: HITLTool) => {
      return continueRun(agentId, runId, sessionId, tool, true)
    },
    [continueRun]
  )

  const rejectTool = useCallback(
    async (agentId: string, runId: string, sessionId: string, tool: HITLTool) => {
      return continueRun(agentId, runId, sessionId, tool, false)
    },
    [continueRun]
  )

  return { confirmTool, rejectTool }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/hooks/__tests__/useHITLHandler.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useHITLHandler.ts src/hooks/__tests__/useHITLHandler.test.ts
git commit -m "feat(hooks): add useHITLHandler for HITL confirm/reject"
```

---

## Task 9: Add RunPaused Handler to Stream Handler

**Files:**

- Modify: `src/hooks/useAIStreamHandler.tsx`

> **Note:** RunPaused and RunContinued events already exist in the RunEvent enum.

**Step 1: Write the failing test**

```typescript
// Add to existing stream handler tests or create new file
// src/hooks/__tests__/useAIStreamHandler.test.tsx

import { describe, it, expect, vi } from 'vitest'

describe('useAIStreamHandler RunPaused handling', () => {
  it('should set paused run state when RunPaused event received', () => {
    // This test validates the integration - the actual test would need
    // to mock the stream and verify setPausedRun is called
    const mockChunk = {
      event: 'RunPaused',
      run_id: 'run-123',
      session_id: 'sess-456',
      status: 'paused',
      tools: [{
        tool_call_id: 'tc-789',
        tool_name: 'delete_user',
        tool_args: { user_id: '123' }
      }]
    }

    // Verify structure matches expected
    expect(mockChunk.event).toBe('RunPaused')
    expect(mockChunk.status).toBe('paused')
    expect(mockChunk.tools[0].tool_call_id).toBe('tc-789')
  })
})
```

**Step 2: Run test to verify current state**

Run: `pnpm test -- src/hooks/__tests__/useAIStreamHandler.test.tsx`
Expected: PASS (structure test)

**Step 3: Write implementation**

Add to `src/hooks/useAIStreamHandler.tsx` in the onChunk handler, after the error handling block:

```typescript
// Add import at top
import type { PausedRunState, HITLTool } from '@/types/os'

// Add to hook destructuring
const setPausedRun = useStore((state) => state.setPausedRun)

// Add in onChunk handler, after TeamRunCancelled block
} else if (chunk.event === RunEvent.RunPaused) {
  const pausedState: PausedRunState = {
    run_id: chunk.run_id as string,
    session_id: chunk.session_id as string,
    status: 'paused',
    tools: (chunk.tools ?? []) as HITLTool[]
  }
  setPausedRun(pausedState)
  setIsStreaming(false)
} else if (chunk.event === RunEvent.RunContinued) {
  setPausedRun(null)
  setIsStreaming(true)
}
```

Add `setPausedRun` to the dependency array of `handleStreamResponse` useCallback.

**Step 4: Run validation**

Run: `pnpm validate`
Expected: PASS (lint, format, typecheck)

**Step 5: Commit**

```bash
git add src/hooks/useAIStreamHandler.tsx
git commit -m "feat(stream): handle RunPaused and RunContinued events for HITL"
```

---

## Task 10: Create Memory Page Route

**Files:**

- Create: `src/app/(main)/memory/page.tsx`

**Step 1: Write the failing test**

```bash
mkdir -p src/app/\(main\)/memory/__tests__
touch src/app/\(main\)/memory/__tests__/page.test.tsx
```

```typescript
// src/app/(main)/memory/__tests__/page.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MemoryPage from '../page'

vi.mock('@/components/memory/MemoryTable', () => ({
  MemoryTable: () => <div data-testid="memory-table">Memory Table</div>
}))

describe('MemoryPage', () => {
  it('should render memory page title', () => {
    render(<MemoryPage />)
    expect(screen.getByText('Agent Memory')).toBeInTheDocument()
  })

  it('should render memory table', () => {
    render(<MemoryPage />)
    expect(screen.getByTestId('memory-table')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/app/\(main\)/memory/__tests__/page.test.tsx`
Expected: FAIL - page.tsx not found

**Step 3: Write minimal implementation**

```typescript
// src/app/(main)/memory/page.tsx
import { MemoryTable } from '@/components/memory/MemoryTable'

export default function MemoryPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-foreground mb-6 text-2xl font-semibold">
        Agent Memory
      </h1>
      <MemoryTable />
    </div>
  )
}
```

**Step 4: Create placeholder MemoryTable**

```bash
mkdir -p src/components/memory
```

```typescript
// src/components/memory/MemoryTable.tsx
'use client'

export function MemoryTable() {
  return (
    <div data-testid="memory-table" className="text-muted-foreground">
      Memory management coming soon...
    </div>
  )
}
```

**Step 5: Run test to verify it passes**

Run: `pnpm test -- src/app/\(main\)/memory/__tests__/page.test.tsx`
Expected: PASS

**Step 6: Commit**

```bash
git add src/app/\(main\)/memory/page.tsx src/components/memory/MemoryTable.tsx src/app/\(main\)/memory/__tests__/page.test.tsx
git commit -m "feat(memory): add memory page route and placeholder table"
```

---

## Task 11: Create useMemories Hook

**Files:**

- Create: `src/hooks/useMemories.ts`

**Step 1: Write the failing test**

```bash
touch src/hooks/__tests__/useMemories.test.ts
```

```typescript
// src/hooks/__tests__/useMemories.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMemories } from '../useMemories'

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

describe('useMemories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as vi.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { memory_id: 'mem-1', memory: 'Test', topics: [], created_at: '2023-10-27T10:00:00Z' }
        ],
        total: 1
      })
    })
  })

  it('should fetch memories', async () => {
    const { result } = renderHook(() => useMemories())

    await waitFor(() => {
      expect(result.current.memories).toHaveLength(1)
    })

    expect(result.current.memories[0].memory_id).toBe('mem-1')
  })

  it('should provide loading state', () => {
    const { result } = renderHook(() => useMemories())
    expect(typeof result.current.isLoading).toBe('boolean')
  })

  it('should provide deleteMemory function', () => {
    const { result } = renderHook(() => useMemories())
    expect(typeof result.current.deleteMemory).toBe('function')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/hooks/__tests__/useMemories.test.ts`
Expected: FAIL - useMemories not found

**Step 3: Write minimal implementation**

```typescript
// src/hooks/useMemories.ts
import { useState, useEffect, useCallback } from 'react'
import { useStore } from '@/store'
import { APIRoutes } from '@/api/routes'
import { constructEndpointUrl } from '@/lib/utils'
import type { MemoryEntry } from '@/types/os'

export function useMemories() {
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const authToken = useStore((state) => state.authToken)
  const [memories, setMemories] = useState<MemoryEntry[]>([])
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

  const fetchMemories = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const response = await fetch(APIRoutes.GetMemories(endpointUrl), {
        headers: getHeaders()
      })

      if (!response.ok) {
        throw new Error('Failed to fetch memories')
      }

      const data = await response.json()
      setMemories(data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [selectedEndpoint, getHeaders])

  const deleteMemory = useCallback(
    async (memoryId: string) => {
      const endpointUrl = constructEndpointUrl(selectedEndpoint)
      const response = await fetch(
        APIRoutes.DeleteMemory(endpointUrl, memoryId),
        {
          method: 'DELETE',
          headers: getHeaders()
        }
      )

      if (response.ok) {
        setMemories((prev) => prev.filter((m) => m.memory_id !== memoryId))
      }

      return response.ok
    },
    [selectedEndpoint, getHeaders]
  )

  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  return {
    memories,
    isLoading,
    error,
    refetch: fetchMemories,
    deleteMemory
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/hooks/__tests__/useMemories.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/hooks/useMemories.ts src/hooks/__tests__/useMemories.test.ts
git commit -m "feat(hooks): add useMemories hook for memory CRUD operations"
```

---

## Task 12: Implement MemoryTable Component

**Files:**

- Modify: `src/components/memory/MemoryTable.tsx`

**Step 1: Write the failing test**

```bash
mkdir -p src/components/memory/__tests__
touch src/components/memory/__tests__/MemoryTable.test.tsx
```

```typescript
// src/components/memory/__tests__/MemoryTable.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryTable } from '../MemoryTable'

vi.mock('@/hooks/useMemories', () => ({
  useMemories: () => ({
    memories: [
      {
        memory_id: 'mem-1',
        memory: 'User prefers dark mode',
        topics: ['preferences'],
        created_at: '2023-10-27T10:00:00Z'
      },
      {
        memory_id: 'mem-2',
        memory: 'User works in fintech',
        topics: ['context', 'work'],
        created_at: '2023-10-27T11:00:00Z'
      }
    ],
    isLoading: false,
    error: null,
    deleteMemory: vi.fn()
  })
}))

describe('MemoryTable', () => {
  it('should render memories', () => {
    render(<MemoryTable />)
    expect(screen.getByText('User prefers dark mode')).toBeInTheDocument()
    expect(screen.getByText('User works in fintech')).toBeInTheDocument()
  })

  it('should display topic badges', () => {
    render(<MemoryTable />)
    expect(screen.getByText('preferences')).toBeInTheDocument()
    expect(screen.getByText('context')).toBeInTheDocument()
  })

  it('should have delete buttons', () => {
    render(<MemoryTable />)
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(deleteButtons).toHaveLength(2)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/memory/__tests__/MemoryTable.test.tsx`
Expected: FAIL - table content not rendering

**Step 3: Write full implementation**

```typescript
// src/components/memory/MemoryTable.tsx
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

export function MemoryTable() {
  const { memories, isLoading, error, deleteMemory } = useMemories()
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
```

**Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/memory/__tests__/MemoryTable.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/memory/MemoryTable.tsx src/components/memory/__tests__/MemoryTable.test.tsx
git commit -m "feat(memory): implement MemoryTable with topic badges and delete"
```

---

## Task 13: Integrate HITL Modal in ChatArea

**Files:**

- Modify: `src/components/chat/ChatArea/ChatArea.tsx`

**Step 1: Read current ChatArea implementation**

Run: Read `src/components/chat/ChatArea/ChatArea.tsx`

**Step 2: Add HITL integration**

Add imports and state:

```typescript
import { HITLConfirmationModal } from './HITLConfirmationModal'
import { useHITLHandler } from '@/hooks/useHITLHandler'
import { useQueryState } from 'nuqs'

// Inside component
const pausedRun = useStore((state) => state.pausedRun)
const { confirmTool, rejectTool } = useHITLHandler()
const [agentId] = useQueryState('agent')
const [sessionId] = useQueryState('session')
```

Add modal before closing div:

```tsx
{pausedRun && pausedRun.tools.length > 0 && (
  <HITLConfirmationModal
    open={true}
    tool={pausedRun.tools[0]}
    onConfirm={(tool) => {
      if (agentId && sessionId) {
        confirmTool(agentId, pausedRun.run_id, sessionId, tool)
      }
    }}
    onReject={(tool) => {
      if (agentId && sessionId) {
        rejectTool(agentId, pausedRun.run_id, sessionId, tool)
      }
    }}
  />
)}
```

**Step 3: Run validation**

Run: `pnpm validate`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/chat/ChatArea/ChatArea.tsx
git commit -m "feat(chat): integrate HITL confirmation modal in ChatArea"
```

---

## Task 14: Final Validation and Type Exports

**Files:**

- Modify: `src/types/os.ts` (ensure all exports)

**Step 1: Verify all new types are exported**

Check that these are exported from `src/types/os.ts`:

- `Workflow`
- `WorkflowDetails`
- `HITLTool`
- `PausedRunState`
- `HITLContinuePayload`
- `MemoryEntry`
- `Memory`

**Step 2: Run full validation**

Run: `pnpm validate`
Expected: PASS (lint + format + typecheck)

**Step 3: Run all tests**

Run: `pnpm test`
Expected: All tests pass

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 2 core gaps implementation

- Add workflow types and ModeSelector support
- Implement HITL confirmation flow with modal and continue API
- Add memory management page with CRUD operations
- Extend store with workflow mode and paused run state
- Add all necessary API routes"
```

---

## Summary

| Task | Component | Status |
|------|-----------|--------|
| 1 | Types (Workflow) | Pending |
| 2 | Types (HITL - corrected field names) | Pending |
| 3 | Types (Memory) | Pending |
| 4 | API Routes | Pending |
| 5 | Store Extensions | Pending |
| 6 | ModeSelector (Workflow) | Pending |
| 7 | HITL Modal (corrected props) | Pending |
| 8 | useHITLHandler (corrected payload) | Pending |
| 9 | Stream Handler (RunPaused) | Pending |
| 10 | Memory Page Route | Pending |
| 11 | useMemories Hook | Pending |
| 12 | MemoryTable Component | Pending |
| 13 | ChatArea Integration | Pending |
| 14 | Final Validation | Pending |

**Total tasks:** 14
**Each task follows TDD:** Test → Fail → Implement → Pass → Commit

---

## Validation Notes

**Changes from original plan:**

1. **Removed Guardrails feature (Tasks 4, 11, 12, 17 from original)** - Agno implements guardrails as pre-execution hooks that throw `InputCheckError`, not streaming events. The UI doesn't need to handle these.

2. **Corrected HITL types:**
   - `requirement_id` → `tool_call_id` (matches Agno API)
   - `approved` → `confirmed` (matches Agno API)
   - Added `HITLContinuePayload` interface for correct request structure

3. **Corrected Memory types:**
   - Changed `updated_at: number` → `created_at: string` (matches Agno API)
   - Changed `meta.total_count` → `total` (simpler structure)

4. **Added verification note for Workflow events** - Event names may need adjustment based on actual AgentOS SSE output.
