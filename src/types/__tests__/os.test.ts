// src/types/__tests__/os.test.ts
import { describe, it, expect } from 'vitest'
import {
  RunEvent,
  type Workflow,
  type WorkflowDetails,
  type HITLTool,
  type PausedRunState,
  type MemoryEntry,
  type Memory
} from '../os'

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
      tools: [
        {
          tool_call_id: 'tc-789',
          tool_name: 'send_email',
          tool_args: {}
        }
      ]
    }
    expect(state.status).toBe('paused')
    expect(state.tools).toHaveLength(1)
    expect(state.tools[0].tool_call_id).toBe('tc-789')
  })
})

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
      data: [
        {
          memory_id: 'mem-1',
          memory: 'Test memory',
          topics: [],
          created_at: '2023-10-27T10:00:00Z'
        }
      ],
      total: 1
    }
    expect(response.data).toHaveLength(1)
    expect(response.total).toBe(1)
  })
})
