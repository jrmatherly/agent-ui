# Agent UI API Reference

## Overview

Agent UI communicates with AgentOS backend instances through a REST API. This document covers the API routes, request/response formats, and streaming protocols.

## Base Configuration

```typescript
// Default endpoint
const DEFAULT_ENDPOINT = 'http://localhost:7777'

// Authentication header (optional)
headers: {
  'Authorization': `Bearer ${authToken}`
}
```

## API Routes

### Health Check

```http
GET /health
```

Check if the AgentOS endpoint is available.

**Response:**

- `200 OK` - Endpoint is healthy
- `503 Service Unavailable` - Endpoint is down

**Usage:**

```typescript
import { getStatusAPI } from '@/api/os'

const status = await getStatusAPI('http://localhost:7777', authToken)
// Returns: 200 | 503
```

---

### List Agents

```http
GET /agents
```

Retrieve all available agents from the AgentOS instance.

**Response:**

```typescript
interface AgentDetails {
  id: string
  name: string
  db_id: string
  model: {
    model: string
    provider: string
  }
}
```

**Usage:**

```typescript
import { getAgentsAPI } from '@/api/os'

const agents = await getAgentsAPI(endpoint, authToken)
// Returns: AgentDetails[]
```

---

### List Teams

```http
GET /teams
```

Retrieve all available teams from the AgentOS instance.

**Response:**

```typescript
interface TeamDetails {
  id: string
  name: string
  db_id: string
  model: {
    model: string
    provider: string
  }
}
```

**Usage:**

```typescript
import { getTeamsAPI } from '@/api/os'

const teams = await getTeamsAPI(endpoint, authToken)
// Returns: TeamDetails[]
```

---

### List Sessions

```http
GET /sessions?type={agent|team}&component_id={id}&db_id={db_id}
```

Retrieve all chat sessions for a specific agent or team.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | `'agent' \| 'team'` | Yes | Entity type |
| `component_id` | `string` | Yes | Agent or team ID |
| `db_id` | `string` | Yes | Database ID |

**Response:**

```typescript
interface Sessions {
  data: SessionEntry[]
  meta: Pagination
}

interface SessionEntry {
  session_id: string
  session_name: string
  created_at: string
  updated_at: string
}
```

**Usage:**

```typescript
import { getAllSessionsAPI } from '@/api/os'

const sessions = await getAllSessionsAPI(
  endpoint,
  'agent',
  agentId,
  dbId,
  authToken
)
```

---

### Get Session Messages

```http
GET /sessions/{sessionId}/runs?type={agent|team}&db_id={db_id}
```

Retrieve all messages/runs for a specific session.

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `sessionId` | `string` | Session identifier |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | `'agent' \| 'team'` | Yes | Entity type |
| `db_id` | `string` | No | Database ID |

**Usage:**

```typescript
import { getSessionAPI } from '@/api/os'

const messages = await getSessionAPI(
  endpoint,
  'agent',
  sessionId,
  dbId,
  authToken
)
```

---

### Delete Session

```http
DELETE /sessions/{sessionId}?db_id={db_id}
```

Delete a chat session.

**Usage:**

```typescript
import { deleteSessionAPI } from '@/api/os'

await deleteSessionAPI(endpoint, dbId, sessionId, authToken)
```

---

### Run Agent (Streaming)

```http
POST /agents/{agent_id}/runs
Content-Type: application/json
```

Send a message to an agent and receive a streaming response.

**Request Body:**

```typescript
{
  message: string
  stream: true
  session_id?: string
  images?: ImageData[]
  videos?: VideoData[]
  audio?: AudioData[]
}
```

**Response:** Server-Sent Events (SSE) stream

---

### Run Team (Streaming)

```http
POST /teams/{team_id}/runs
Content-Type: application/json
```

Send a message to a team and receive a streaming response.

**Request Body:** Same as Agent Run

**Response:** Server-Sent Events (SSE) stream

---

## Streaming Protocol

### Event Format

Agent UI supports two event formats:

#### Legacy Format

```json
data: {"event": "RunContent", "content": "Hello", ...}
```

#### New Format

```json
event: RunContent
data: {"content": "Hello", ...}
```

### Event Types

```typescript
enum RunEvent {
  // Run lifecycle
  RunStarted = 'RunStarted'
  RunContent = 'RunContent'
  RunCompleted = 'RunCompleted'
  RunError = 'RunError'
  RunCancelled = 'RunCancelled'
  RunPaused = 'RunPaused'
  RunContinued = 'RunContinued'

  // Tool calls
  ToolCallStarted = 'ToolCallStarted'
  ToolCallCompleted = 'ToolCallCompleted'

  // Reasoning
  ReasoningStarted = 'ReasoningStarted'
  ReasoningStep = 'ReasoningStep'
  ReasoningCompleted = 'ReasoningCompleted'

  // Memory
  MemoryUpdateStarted = 'MemoryUpdateStarted'
  MemoryUpdateCompleted = 'MemoryUpdateCompleted'

  // Team events (prefixed with Team*)
  TeamRunStarted = 'TeamRunStarted'
  TeamRunContent = 'TeamRunContent'
  TeamRunCompleted = 'TeamRunCompleted'
  TeamRunError = 'TeamRunError'
  // ... and more
}
```

### Stream Processing

```typescript
import useAIResponseStream from '@/hooks/useAIResponseStream'

const { streamResponse } = useAIResponseStream()

await streamResponse({
  apiUrl: `${endpoint}/agents/${agentId}/runs`,
  headers: { Authorization: `Bearer ${token}` },
  requestBody: { message, stream: true, session_id },
  onChunk: (chunk: RunResponseContent) => {
    // Handle each streamed chunk
    switch (chunk.event) {
      case RunEvent.RunContent:
        // Append content to message
        break
      case RunEvent.ToolCallStarted:
        // Show tool call UI
        break
      // ... handle other events
    }
  },
  onError: (error) => console.error(error),
  onComplete: () => console.log('Stream complete')
})
```

---

## Response Types

### RunResponse / RunResponseContent

```typescript
interface RunResponse {
  run_id: string
  session_id: string
  agent_id?: string
  event: RunEvent
  content?: string
  content_type?: string
  created_at?: string
  model?: string

  // Tool calls
  tool?: string
  tools?: ToolCall[]

  // Media
  images?: ImageData[]
  videos?: VideoData[]
  audio?: AudioData[]
  response_audio?: ResponseAudio

  // Reasoning
  extra_data?: AgentExtraData

  // Metrics
  metrics?: object
  context?: MessageContext
}
```

### ToolCall

```typescript
interface ToolCall {
  tool_name: string
  tool_call_id: string
  tool_args: string
  content?: string
  created_at?: string
  tool_call_error?: string
  role: string
  metrics?: object
}
```

### Media Types

```typescript
interface ImageData {
  url: string
  revised_prompt?: string
}

interface VideoData {
  id: string
  url: string
  eta?: number
}

interface AudioData {
  id: string
  url?: string
  base64_audio?: string
  content?: string
  mime_type: string
  sample_rate: number
  channels: number
}
```

---

## Error Handling

All API functions handle errors gracefully:

```typescript
try {
  const agents = await getAgentsAPI(endpoint, authToken)
} catch {
  toast.error('Error fetching agents')
  return []
}
```

Common error responses:

- `401 Unauthorized` - Invalid or missing auth token
- `404 Not Found` - Resource doesn't exist
- `500 Internal Server Error` - Server-side error

---

## Code Examples

### Initialize Connection

```typescript
import { useChatActions } from '@/hooks/useChatActions'

const { initialize } = useChatActions()

// On app mount
useEffect(() => {
  initialize()
}, [])
```

### Send Message

```typescript
const sendMessage = async (content: string) => {
  const { streamResponse } = useAIResponseStream()

  await streamResponse({
    apiUrl: APIRoutes.AgentRun(endpoint).replace('{agent_id}', agentId),
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    requestBody: {
      message: content,
      stream: true,
      session_id: sessionId
    },
    onChunk: handleChunk,
    onError: handleError,
    onComplete: handleComplete
  })
}
```

### Load Session History

```typescript
const loadSession = async (sessionId: string) => {
  const messages = await getSessionAPI(
    endpoint,
    mode,
    sessionId,
    dbId,
    authToken
  )
  setMessages(messages)
}
```
