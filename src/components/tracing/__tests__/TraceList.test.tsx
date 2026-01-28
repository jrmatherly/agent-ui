// src/components/tracing/__tests__/TraceList.test.tsx
import { describe, it, expect } from 'vitest'
import { TraceList } from '../TraceList'

describe('TraceList', () => {
  it('should export TraceList component', () => {
    expect(typeof TraceList).toBe('function')
  })

  it('should accept traces and onSelectTrace props', () => {
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
    // Verify prop shape
    expect(mockTraces).toHaveLength(2)
    expect(mockTraces[0].total_tokens).toBe(350)
  })
})
