export interface ToolCall {
  role: 'user' | 'tool' | 'system' | 'assistant'
  content: string | null
  tool_call_id: string
  tool_name: string
  tool_args: Record<string, string>
  tool_call_error: boolean
  metrics: {
    time: number
  }
  created_at: number
}

export interface ReasoningSteps {
  title: string
  action?: string
  result: string
  reasoning: string
  confidence?: number
  next_action?: string
}
export interface ReasoningStepProps {
  index: number
  stepTitle: string
}
export interface ReasoningProps {
  reasoning: ReasoningSteps[]
}

export type ToolCallProps = {
  tools: ToolCall
}
interface ModelMessage {
  content: string | null
  context?: MessageContext[]
  created_at: number
  metrics?: {
    time: number
    prompt_tokens: number
    input_tokens: number
    completion_tokens: number
    output_tokens: number
  }
  name: string | null
  role: string
  tool_args?: unknown
  tool_call_id: string | null
  tool_calls: Array<{
    function: {
      arguments: string
      name: string
    }
    id: string
    type: string
  }> | null
}

export interface Model {
  name: string
  model: string
  provider: string
}

export interface Agent {
  agent_id: string
  name: string
  description: string
  model: Model
  storage?: boolean
}

export interface Team {
  team_id: string
  name: string
  description: string
  model: Model
  storage?: boolean
}

interface MessageContext {
  query: string
  docs?: Array<Record<string, object>>
  time?: number
}

export enum RunEvent {
  RunStarted = 'RunStarted',
  RunContent = 'RunContent',
  RunCompleted = 'RunCompleted',
  RunError = 'RunError',
  RunOutput = 'RunOutput',
  UpdatingMemory = 'UpdatingMemory',
  ToolCallStarted = 'ToolCallStarted',
  ToolCallCompleted = 'ToolCallCompleted',
  MemoryUpdateStarted = 'MemoryUpdateStarted',
  MemoryUpdateCompleted = 'MemoryUpdateCompleted',
  ReasoningStarted = 'ReasoningStarted',
  ReasoningStep = 'ReasoningStep',
  ReasoningCompleted = 'ReasoningCompleted',
  RunCancelled = 'RunCancelled',
  RunPaused = 'RunPaused',
  RunContinued = 'RunContinued',
  // Team Events
  TeamRunStarted = 'TeamRunStarted',
  TeamRunContent = 'TeamRunContent',
  TeamRunCompleted = 'TeamRunCompleted',
  TeamRunError = 'TeamRunError',
  TeamRunCancelled = 'TeamRunCancelled',
  TeamToolCallStarted = 'TeamToolCallStarted',
  TeamToolCallCompleted = 'TeamToolCallCompleted',
  TeamReasoningStarted = 'TeamReasoningStarted',
  TeamReasoningStep = 'TeamReasoningStep',
  TeamReasoningCompleted = 'TeamReasoningCompleted',
  TeamMemoryUpdateStarted = 'TeamMemoryUpdateStarted',
  TeamMemoryUpdateCompleted = 'TeamMemoryUpdateCompleted',
  // Workflow Events
  // Note: Verify these match AgentOS SSE output (may need adjustment)
  WorkflowStarted = 'WorkflowStarted',
  WorkflowCompleted = 'WorkflowCompleted',
  WorkflowError = 'WorkflowError',
  StepStarted = 'StepStarted',
  StepCompleted = 'StepCompleted'
}

export interface ResponseAudio {
  id?: string
  content?: string
  transcript?: string
  channels?: number
  sample_rate?: number
}

export interface NewRunResponse {
  status: 'RUNNING' | 'PAUSED' | 'CANCELLED'
}

export interface RunResponseContent {
  content?: string | object
  content_type: string
  context?: MessageContext[]
  event: RunEvent
  event_data?: object
  messages?: ModelMessage[]
  metrics?: object
  model?: string
  run_id?: string
  agent_id?: string
  session_id?: string
  tool?: ToolCall
  tools?: Array<ToolCall>
  created_at: number
  extra_data?: AgentExtraData
  images?: ImageData[]
  videos?: VideoData[]
  audio?: AudioData[]
  response_audio?: ResponseAudio
}

export interface RunResponse {
  content?: string | object
  content_type: string
  context?: MessageContext[]
  event: RunEvent
  event_data?: object
  messages?: ModelMessage[]
  metrics?: object
  model?: string
  run_id?: string
  agent_id?: string
  session_id?: string
  tool?: ToolCall
  tools?: Array<ToolCall>
  created_at: number
  extra_data?: AgentExtraData
  images?: ImageData[]
  videos?: VideoData[]
  audio?: AudioData[]
  response_audio?: ResponseAudio
}

export interface AgentExtraData {
  reasoning_steps?: ReasoningSteps[]
  reasoning_messages?: ReasoningMessage[]
  references?: ReferenceData[]
}

export interface AgentExtraData {
  reasoning_messages?: ReasoningMessage[]
  references?: ReferenceData[]
}

export interface ReasoningMessage {
  role: 'user' | 'tool' | 'system' | 'assistant'
  content: string | null
  tool_call_id?: string
  tool_name?: string
  tool_args?: Record<string, string>
  tool_call_error?: boolean
  metrics?: {
    time: number
  }
  created_at?: number
}
export interface ChatMessage {
  role: 'user' | 'agent' | 'system' | 'tool'
  content: string
  streamingError?: boolean
  created_at: number
  tool_calls?: ToolCall[]
  extra_data?: {
    reasoning_steps?: ReasoningSteps[]
    reasoning_messages?: ReasoningMessage[]
    references?: ReferenceData[]
  }
  images?: ImageData[]
  videos?: VideoData[]
  audio?: AudioData[]
  response_audio?: ResponseAudio
}

export interface AgentDetails {
  id: string
  name?: string
  db_id?: string
  // Model
  model?: Model
}

export interface TeamDetails {
  id: string
  name?: string
  db_id?: string

  // Model
  model?: Model
}


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

// Memory Management Types
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

export interface ImageData {
  revised_prompt: string
  url: string
}

export interface VideoData {
  id: number
  eta: number
  url: string
}

export interface AudioData {
  base64_audio?: string
  mime_type?: string
  url?: string
  id?: string
  content?: string
  channels?: number
  sample_rate?: number
}

export interface ReferenceData {
  query: string
  references: Reference[]
  time?: number
}

export interface Reference {
  content: string
  meta_data: {
    chunk: number
    chunk_size: number
  }
  name: string
}

export interface SessionEntry {
  session_id: string
  session_name: string
  created_at: number
  updated_at?: number
  total_tokens?: number
  model?: string
}

export interface Pagination {
  page: number
  limit: number
  total_pages: number
  total_count: number
}

export interface Sessions extends SessionEntry {
  data: SessionEntry[]
  meta: Pagination
}

export interface ChatEntry {
  message: {
    role: 'user' | 'system' | 'tool' | 'assistant'
    content: string
    created_at: number
  }
  response: {
    content: string
    tools?: ToolCall[]
    extra_data?: {
      reasoning_steps?: ReasoningSteps[]
      reasoning_messages?: ReasoningMessage[]
      references?: ReferenceData[]
    }
    images?: ImageData[]
    videos?: VideoData[]
    audio?: AudioData[]
    response_audio?: {
      transcript?: string
    }
    created_at: number
  }
}

// Tracing Types
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
