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
      tools: [
        {
          tool_call_id: 'tc-1',
          tool_name: 'test_tool',
          tool_args: {}
        }
      ]
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
