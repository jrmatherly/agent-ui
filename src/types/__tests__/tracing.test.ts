// src/types/__tests__/tracing.test.ts
import { describe, it, expect } from 'vitest'
import type { Trace, Span, TraceListResponse } from '../os'

describe('Tracing types', () => {
  it('should define Span interface', () => {
    const span: Span = {
      span_id: 'span-123',
      parent_span_id: null,
      name: 'llm_call',
      start_time: 1706400000000,
      end_time: 1706400001500,
      duration_ms: 1500,
      status: 'ok',
      attributes: {
        model: 'gpt-4',
        tokens_input: 150,
        tokens_output: 200
      }
    }
    expect(span.span_id).toBe('span-123')
    expect(span.duration_ms).toBe(1500)
  })

  it('should define Trace interface', () => {
    const trace: Trace = {
      trace_id: 'trace-456',
      session_id: 'sess-789',
      run_id: 'run-101',
      agent_id: 'agent-102',
      start_time: 1706400000000,
      end_time: 1706400005000,
      duration_ms: 5000,
      status: 'ok',
      spans: [],
      total_tokens: 350,
      total_cost: 0.0035
    }
    expect(trace.trace_id).toBe('trace-456')
    expect(trace.total_tokens).toBe(350)
  })

  it('should define TraceListResponse interface', () => {
    const response: TraceListResponse = {
      data: [],
      meta: {
        page: 1,
        limit: 20,
        total_count: 0,
        total_pages: 0
      }
    }
    expect(response.data).toEqual([])
  })
})
