# Phase 1: Quick Wins - Executable Implementation Plan

**Created:** 2026-01-27
**Scope:** 3 features from research document
**Estimated Effort:** 1-2 weeks

---

## Overview

This plan implements Phase 1 (Quick Wins) from the Agno UI/UX Enhancement Research:

1. **Task 1: Run Cancellation Button** - Allow users to stop long-running agent/team responses
2. **Task 2: Session Metrics Display** - Show token count and timestamps in session list
3. **Task 3: Enhanced Reasoning Collapse UI** - Collapsible reasoning steps with details

---

## Task 1: Run Cancellation Button

### 1.1 Add Cancel API Route

**File:** `src/api/routes.ts`

**Action:** Add CancelRun route

```typescript
// Add after line 14 (TeamRun)
CancelAgentRun: (agentOSUrl: string, agentId: string, runId: string) =>
  `${agentOSUrl}/agents/${agentId}/runs/${runId}/cancel`,
CancelTeamRun: (agentOSUrl: string, teamId: string, runId: string) =>
  `${agentOSUrl}/teams/${teamId}/runs/${runId}/cancel`,
```

**Verification:** TypeScript compiles without errors

---

### 1.2 Add cancelRun to API Functions

**File:** `src/api/os.ts`

**Action:** Add cancelRun function

```typescript
export async function cancelRunAPI(
  endpoint: string,
  entityType: 'agent' | 'team',
  entityId: string,
  runId: string,
  authToken?: string
): Promise<void> {
  const url = entityType === 'agent'
    ? APIRoutes.CancelAgentRun(endpoint, entityId, runId)
    : APIRoutes.CancelTeamRun(endpoint, entityId, runId)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers
  })

  if (!response.ok) {
    throw new Error(`Failed to cancel run: ${response.statusText}`)
  }
}
```

**Verification:** TypeScript compiles without errors

---

### 1.3 Add runId to Store

**File:** `src/store.ts`

**Action:** Add currentRunId state to track active run

Add to Store interface (after line 26):

```typescript
currentRunId: string | null
setCurrentRunId: (runId: string | null) => void
```

Add to store implementation (after line 68):

```typescript
currentRunId: null,
setCurrentRunId: (runId) => set(() => ({ currentRunId: runId })),
```

**Verification:** TypeScript compiles without errors

---

### 1.4 Track runId in Stream Handler

**File:** `src/hooks/useAIStreamHandler.tsx`

**Action:** Update to track currentRunId

Add import and store access:

```typescript
const setCurrentRunId = useStore((state) => state.setCurrentRunId)
```

In `handleStreamResponse`, after RunStarted event (around line 183):

```typescript
if (chunk.run_id) {
  setCurrentRunId(chunk.run_id)
}
```

In `finally` block (around line 426):

```typescript
setCurrentRunId(null)
```

**Verification:** TypeScript compiles without errors

---

### 1.5 Create Cancel Button in ChatInput

**File:** `src/components/chat/ChatArea/ChatInput/ChatInput.tsx`

**Action:** Add cancel button that shows during streaming

Add imports:

```typescript
import { cancelRunAPI } from '@/api/os'
```

Add store access:

```typescript
const currentRunId = useStore((state) => state.currentRunId)
const mode = useStore((state) => state.mode)
const selectedEndpoint = useStore((state) => state.selectedEndpoint)
const authToken = useStore((state) => state.authToken)
```

Add cancel handler:

```typescript
const handleCancel = async () => {
  if (!currentRunId) return
  const entityId = mode === 'team' ? teamId : selectedAgent
  if (!entityId) return

  try {
    await cancelRunAPI(selectedEndpoint, mode, entityId, currentRunId, authToken)
  } catch (error) {
    toast.error(`Failed to cancel: ${error instanceof Error ? error.message : String(error)}`)
  }
}
```

Replace the send Button with conditional rendering:

```tsx
{isStreaming ? (
  <Button
    onClick={handleCancel}
    size="icon"
    variant="ghost"
    className="bg-destructive/10 hover:bg-destructive/20 rounded-xl p-5 transition-colors"
  >
    <Icon type="stop" className="text-destructive" />
  </Button>
) : (
  <Button
    onClick={handleSubmit}
    disabled={!(selectedAgent || teamId) || !inputMessage.trim()}
    size="icon"
    className="bg-brand hover:bg-brand/90 active:bg-brand/80 rounded-xl p-5 text-white transition-colors"
  >
    <Icon type="send" className="text-white" />
  </Button>
)}
```

**Verification:**

- `mise validate` passes
- Dev server shows cancel button during streaming

---

### 1.6 Add Stop Icon

**File:** `src/components/ui/icon/constants.tsx`

**Action:** Add StopCircle icon

```typescript
import { StopCircle } from 'lucide-react'

// In ICONS object:
stop: StopCircle,
```

**File:** `src/components/ui/icon/types.ts`

**Action:** Add 'stop' to IconType

```typescript
| 'stop'
```

**Verification:** TypeScript compiles without errors

---

## Task 2: Session Metrics Display

### 2.1 Extend SessionEntry Type

**File:** `src/types/os.ts`

**Action:** Add optional metrics fields to SessionEntry

```typescript
export interface SessionEntry {
  session_id: string
  session_name: string
  created_at: number
  updated_at?: number
  // New metrics fields (optional for backwards compatibility)
  total_tokens?: number
  model?: string
}
```

**Verification:** TypeScript compiles without errors

---

### 2.2 Create Token Badge Component

**File:** `src/components/ui/token-badge.tsx` (NEW)

**Action:** Create a small badge component for token display

```typescript
import { cn } from '@/lib/utils'

interface TokenBadgeProps {
  tokens: number
  className?: string
}

export function TokenBadge({ tokens, className }: TokenBadgeProps) {
  const formatted = tokens >= 1000
    ? `${(tokens / 1000).toFixed(1)}k`
    : tokens.toString()

  return (
    <span className={cn(
      'text-muted-foreground bg-accent rounded px-1.5 py-0.5 text-[10px] font-medium',
      className
    )}>
      {formatted} tokens
    </span>
  )
}
```

**Verification:** TypeScript compiles without errors

---

### 2.3 Update SessionItem to Show Metrics

**File:** `src/components/chat/Sidebar/Sessions/SessionItem.tsx`

**Action:** Add metrics display

Add imports:

```typescript
import { TokenBadge } from '@/components/ui/token-badge'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)
```

Update the component to show metrics below title:

```tsx
<div className="flex flex-col gap-1">
  <h4 className={cn('text-sm font-medium', isSelected && 'text-primary')}>
    {truncateText(title, 20)}
  </h4>
  <div className="flex items-center gap-2">
    {total_tokens && <TokenBadge tokens={total_tokens} />}
    {updated_at && (
      <span className="text-muted-foreground text-[10px]">
        {dayjs(updated_at * 1000).fromNow()}
      </span>
    )}
  </div>
</div>
```

Update props type:

```typescript
type SessionItemProps = SessionEntry & {
  isSelected: boolean
  currentSessionId: string | null
  onSessionClick: () => void
}
```

Destructure new props:

```typescript
const SessionItem = ({
  session_name: title,
  session_id,
  total_tokens,
  updated_at,
  isSelected,
  currentSessionId,
  onSessionClick
}: SessionItemProps) => {
```

**Verification:**

- `mise validate` passes
- Session items show metrics when data available

---

## Task 3: Enhanced Reasoning Collapse UI

### 3.1 Add Collapsible Component

**File:** `src/components/ui/collapsible.tsx` (NEW)

**Action:** Create Collapsible component using Radix

```typescript
'use client'

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible'

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
```

**Verification:** TypeScript compiles without errors

---

### 3.2 Install Radix Collapsible (if needed)

**Command:** Check if already installed, if not:

```bash
pnpm add @radix-ui/react-collapsible
```

**Verification:** Package installs successfully

---

### 3.3 Add ChevronDown Icon

**File:** `src/components/ui/icon/constants.tsx`

**Action:** Add ChevronDown icon (if not already present)

```typescript
import { ChevronDown } from 'lucide-react'

// In ICONS object:
chevronDown: ChevronDown,
```

**File:** `src/components/ui/icon/types.ts`

**Action:** Add to IconType (if not already present)

```typescript
| 'chevronDown'
```

**Verification:** TypeScript compiles without errors

---

### 3.4 Create Enhanced ReasoningCollapsible Component

**File:** `src/components/chat/ChatArea/Messages/ReasoningCollapsible.tsx` (NEW)

**Action:** Create collapsible reasoning display

```typescript
'use client'

import { useState } from 'react'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import Icon from '@/components/ui/icon'
import { ReasoningSteps } from '@/types/os'
import { cn } from '@/lib/utils'

interface ReasoningCollapsibleProps {
  reasoning: ReasoningSteps[]
}

interface ReasoningStepDetailProps {
  step: ReasoningSteps
  index: number
}

const ReasoningStepDetail = ({ step, index }: ReasoningStepDetailProps) => (
  <div className="border-border flex flex-col gap-2 border-l-2 py-2 pl-4">
    <div className="flex items-center gap-2">
      <span className="bg-accent text-foreground rounded px-2 py-0.5 text-xs font-medium">
        STEP {index + 1}
      </span>
      <span className="text-foreground text-sm font-medium">{step.title}</span>
      {step.confidence !== undefined && (
        <span className="text-muted-foreground text-xs">
          ({Math.round(step.confidence * 100)}% confidence)
        </span>
      )}
    </div>
    {step.reasoning && (
      <p className="text-muted-foreground text-xs">{step.reasoning}</p>
    )}
    {step.action && (
      <div className="text-xs">
        <span className="text-muted-foreground">Action: </span>
        <span className="text-foreground">{step.action}</span>
      </div>
    )}
    {step.result && (
      <div className="text-xs">
        <span className="text-muted-foreground">Result: </span>
        <span className="text-foreground">{step.result}</span>
      </div>
    )}
  </div>
)

export default function ReasoningCollapsible({ reasoning }: ReasoningCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-accent">
        <Icon type="reasoning" size="sm" />
        <span className="text-foreground text-sm font-medium">
          Reasoning ({reasoning.length} step{reasoning.length !== 1 ? 's' : ''})
        </span>
        <Icon
          type="chevron-down"
          size="xs"
          className={cn(
            'text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3 space-y-2">
        {reasoning.map((step, index) => (
          <ReasoningStepDetail
            key={`${step.title}-${index}`}
            step={step}
            index={index}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}
```

**Verification:** TypeScript compiles without errors

---

### 3.5 Update Messages.tsx to Use New Component

**File:** `src/components/chat/ChatArea/Messages/Messages.tsx`

**Action:** Replace inline Reasonings with ReasoningCollapsible

Add import:

```typescript
import ReasoningCollapsible from './ReasoningCollapsible'
```

Replace the reasoning section in AgentMessageWrapper (lines 65-80):

```tsx
{message.extra_data?.reasoning_steps &&
  message.extra_data.reasoning_steps.length > 0 && (
    <div className="flex items-start gap-4">
      <ReasoningCollapsible reasoning={message.extra_data.reasoning_steps} />
    </div>
  )}
```

Remove the old Reasoning and Reasonings components (lines 128-146) as they're no longer needed.

**Verification:**

- `mise validate` passes
- Reasoning steps are collapsible in chat UI

---

## Final Verification

After all tasks complete:

```bash
# Run full validation
mise validate

# Start dev server and test manually
mise dev
```

**Test Checklist:**

1. **Run Cancellation:**
   - [ ] Cancel button appears during streaming
   - [ ] Clicking cancel stops the stream
   - [ ] Send button returns after cancellation

2. **Session Metrics:**
   - [ ] Sessions show token count when available
   - [ ] Sessions show relative time (e.g., "2 hours ago")
   - [ ] Layout doesn't break when metrics are missing

3. **Reasoning Collapse:**
   - [ ] Reasoning section is collapsed by default
   - [ ] Click expands to show all steps
   - [ ] Step details (confidence, action, result) are visible
   - [ ] Chevron rotates on expand/collapse

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @radix-ui/react-collapsible | ^1.0.x | Collapsible component (install required) |
| dayjs | existing | Time formatting (already installed) |

---

## Rollback Plan

If issues arise, revert changes in order:

1. Messages.tsx (restore old Reasonings component)
2. Remove ReasoningCollapsible.tsx
3. Remove collapsible.tsx
4. Revert SessionItem.tsx
5. Revert ChatInput.tsx
6. Revert store.ts
7. Revert useAIStreamHandler.tsx
8. Revert api/os.ts and api/routes.ts
