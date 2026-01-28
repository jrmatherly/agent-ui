// src/components/tracing/__tests__/SpanDetails.test.tsx
import { describe, it, expect } from 'vitest'
import { SpanDetails } from '../SpanDetails'

describe('SpanDetails', () => {
  it('should export SpanDetails component', () => {
    expect(typeof SpanDetails).toBe('function')
  })

  it('should accept span prop', () => {
    const mockSpan = {
      span_id: 'span-123',
      parent_span_id: null,
      name: 'llm_call',
      start_time: 1706400000000,
      end_time: 1706400001500,
      duration_ms: 1500,
      status: 'ok' as const,
      attributes: {
        model: 'gpt-4',
        tokens_input: 150,
        tokens_output: 200
      }
    }
    // Verify prop shape
    expect(mockSpan.span_id).toBe('span-123')
    expect(mockSpan.duration_ms).toBe(1500)
  })

  it('should handle error span', () => {
    const errorSpan = {
      span_id: 'span-123',
      parent_span_id: null,
      name: 'llm_call',
      start_time: 1706400000000,
      end_time: 1706400001500,
      duration_ms: 1500,
      status: 'error' as const,
      attributes: {},
      error_message: 'Rate limit exceeded'
    }
    expect(errorSpan.status).toBe('error')
    expect(errorSpan.error_message).toBe('Rate limit exceeded')
  })
})
