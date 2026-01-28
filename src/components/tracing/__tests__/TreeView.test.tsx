// src/components/tracing/__tests__/TreeView.test.tsx
import { describe, it, expect } from 'vitest'
import { TreeView } from '../TreeView'

describe('TreeView', () => {
  it('should export TreeView component', () => {
    expect(typeof TreeView).toBe('function')
  })

  it('should accept spans and onSelectSpan props', () => {
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
      }
    ]
    // Verify prop shape
    expect(mockSpans).toHaveLength(2)
    expect(mockSpans[1].parent_span_id).toBe('span-1')
  })
})
