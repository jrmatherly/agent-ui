# React Hooks Reference

## Overview

Agent UI provides custom React hooks for managing chat functionality, API communication, and session handling. These hooks abstract complex logic and provide clean interfaces for components.

---

## useChatActions

Primary hook for chat operations and initialization.

### Location

`src/hooks/useChatActions.ts`

### Returns

```typescript
{
  clearChat: () => void
  addMessage: (message: ChatMessage) => void
  getAgents: () => Promise<AgentDetails[]>
  getTeams: () => Promise<TeamDetails[]>
  focusChatInput: () => void
  initialize: () => Promise<{ agents: AgentDetails[], teams: TeamDetails[] }>
}
```

### Methods

#### `initialize()`

Initializes the application by checking endpoint health and loading entities.

```typescript
const { initialize } = useChatActions()

useEffect(() => {
  initialize()
}, [initialize])
```

**Behavior:**

1. Sets `isEndpointLoading: true`
2. Calls `getStatusAPI()` to check health
3. If healthy (200):
   - Fetches agents and teams
   - Auto-selects first entity based on mode
   - Updates store with entities
4. If unhealthy:
   - Sets `isEndpointActive: false`
   - Clears selections
5. Sets `isEndpointLoading: false`

#### `clearChat()`

Clears current conversation and resets session.

```typescript
const { clearChat } = useChatActions()

<Button onClick={clearChat}>New Chat</Button>
```

**Behavior:**

- Calls `setMessages([])`
- Calls `setSessionId(null)` via URL state

#### `addMessage(message: ChatMessage)`

Appends a message to the conversation.

```typescript
const { addMessage } = useChatActions()

addMessage({
  role: 'user',
  content: 'Hello, agent!',
  created_at: new Date().toISOString()
})
```

#### `getAgents()`

Fetches available agents from the endpoint.

```typescript
const { getAgents } = useChatActions()

const agents = await getAgents()
// Returns: AgentDetails[]
```

#### `getTeams()`

Fetches available teams from the endpoint.

```typescript
const { getTeams } = useChatActions()

const teams = await getTeams()
// Returns: TeamDetails[]
```

#### `focusChatInput()`

Programmatically focuses the chat input textarea.

```typescript
const { focusChatInput } = useChatActions()

// After some action
focusChatInput()
```

### Dependencies

Uses these store selectors:

- `chatInputRef`
- `selectedEndpoint`
- `authToken`
- `setMessages`, `setAgents`, `setTeams`
- `setIsEndpointActive`, `setIsEndpointLoading`
- `setSelectedModel`, `setMode`

Uses URL state via `nuqs`:

- `useQueryState('session')`
- `useQueryState('agent')`
- `useQueryState('team')`
- `useQueryState('db_id')`

---

## useAIResponseStream

Low-level hook for handling Server-Sent Events (SSE) streaming.

### Location

`src/hooks/useAIResponseStream.tsx`

### Returns

```typescript
{
  streamResponse: (options: StreamOptions) => Promise<void>
}
```

### StreamOptions

```typescript
interface StreamOptions {
  apiUrl: string
  headers?: Record<string, string>
  requestBody: FormData | Record<string, unknown>
  onChunk: (chunk: RunResponseContent) => void
  onError: (error: Error) => void
  onComplete: () => void
}
```

### Usage

```typescript
const { streamResponse } = useAIResponseStream()

await streamResponse({
  apiUrl: `${endpoint}/agents/${agentId}/runs`,
  headers: {
    Authorization: `Bearer ${token}`
  },
  requestBody: {
    message: 'Hello!',
    stream: true,
    session_id: sessionId
  },
  onChunk: (chunk) => {
    console.log('Received:', chunk.event, chunk.content)
  },
  onError: (error) => {
    console.error('Stream error:', error.message)
  },
  onComplete: () => {
    console.log('Stream finished')
  }
})
```

### Stream Processing

The hook handles two event formats:

#### Legacy Format

```json
data: {"event": "RunContent", "content": "Hello"}
```

#### New Format

```json
event: RunContent
data: {"content": "Hello"}
```

### Internal Functions

#### `parseBuffer(buffer, onChunk)`

Extracts complete JSON objects from the stream buffer.

#### `processChunk(chunk)`

Converts chunk data to `RunResponseContent`.

#### `isLegacyFormat(data)`

Detects which event format is being used.

#### `convertNewFormatToLegacy(data)`

Normalizes new format to legacy for consistent handling.

### Error Handling

```typescript
try {
  await streamResponse(options)
} catch (error) {
  // Errors are passed to onError callback
  // Network errors, JSON parse errors, etc.
}
```

---

## useAIStreamHandler

Higher-level hook for routing stream events to appropriate handlers.

### Location

`src/hooks/useAIStreamHandler.tsx`

### Purpose

Routes `RunEvent` types to specific handling logic:

- Content accumulation
- Tool call management
- Reasoning step updates
- Error handling

### Event Routing

```typescript
switch (chunk.event) {
  case RunEvent.RunStarted:
    // Initialize response message
    break

  case RunEvent.RunContent:
    // Append content to message
    break

  case RunEvent.ToolCallStarted:
    // Add tool call placeholder
    break

  case RunEvent.ToolCallCompleted:
    // Update tool call with result
    break

  case RunEvent.ReasoningStarted:
    // Begin reasoning display
    break

  case RunEvent.ReasoningStep:
    // Add reasoning step
    break

  case RunEvent.RunCompleted:
    // Finalize message
    break

  case RunEvent.RunError:
    // Handle error state
    break
}
```

---

## useSessionLoader

Hook for loading and managing chat sessions.

### Location

`src/hooks/useSessionLoader.tsx`

### Purpose

Handles:

- Loading session history from API
- Parsing response into `ChatMessage[]` format
- Managing loading states

### Usage

```typescript
const { loadSession, isLoading } = useSessionLoader()

// When user selects a session
const handleSessionSelect = async (sessionId: string) => {
  await loadSession(sessionId)
}
```

### Session Data Transformation

Converts API response format to internal `ChatMessage[]`:

```typescript
// API Response
{
  runs: [
    {
      message: { content, role, images, ... },
      response: { content, tool_calls, reasoning, ... }
    }
  ]
}

// Transformed to
ChatMessage[] = [
  { role: 'user', content, images, ... },
  { role: 'assistant', content, tool_calls, extra_data, ... }
]
```

---

## Hook Composition Example

Complete message sending flow using multiple hooks:

```typescript
import { useChatActions } from '@/hooks/useChatActions'
import useAIResponseStream from '@/hooks/useAIResponseStream'
import { useStore } from '@/store'

function useSendMessage() {
  const { addMessage, focusChatInput } = useChatActions()
  const { streamResponse } = useAIResponseStream()
  const setIsStreaming = useStore((state) => state.setIsStreaming)
  const setMessages = useStore((state) => state.setMessages)

  const sendMessage = async (content: string, agentId: string) => {
    // 1. Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content,
      created_at: new Date().toISOString()
    }
    addMessage(userMessage)

    // 2. Add placeholder for assistant response
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString()
    }
    addMessage(assistantMessage)

    // 3. Start streaming
    setIsStreaming(true)

    try {
      await streamResponse({
        apiUrl: `/agents/${agentId}/runs`,
        requestBody: { message: content, stream: true },
        onChunk: (chunk) => {
          if (chunk.event === 'RunContent') {
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              last.content += chunk.content || ''
              return updated
            })
          }
        },
        onError: (error) => {
          console.error(error)
        },
        onComplete: () => {
          setIsStreaming(false)
          focusChatInput()
        }
      })
    } catch (error) {
      setIsStreaming(false)
    }
  }

  return { sendMessage }
}
```

---

## Best Practices

### 1. Use Selective Store Subscriptions

```typescript
// Good - only re-renders when agents change
const agents = useStore((state) => state.agents)

// Avoid - re-renders on any store change
const { agents, teams, messages } = useStore()
```

### 2. Memoize Callbacks

```typescript
const handleSubmit = useCallback(async () => {
  await sendMessage(input)
}, [input, sendMessage])
```

### 3. Handle Loading States

```typescript
const { isEndpointLoading } = useStore()

if (isEndpointLoading) {
  return <Skeleton />
}
```

### 4. Clean Up on Unmount

```typescript
useEffect(() => {
  const controller = new AbortController()

  // Use controller.signal in fetch

  return () => controller.abort()
}, [])
```
