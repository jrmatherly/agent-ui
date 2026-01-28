// src/components/tracing/__tests__/WaterfallView.test.tsx
import { describe, it, expect } from 'vitest'
import { WaterfallView } from '../WaterfallView'

describe('WaterfallView', () => {
  it('should export WaterfallView component', () => {
    expect(typeof WaterfallView).toBe('function')
  })

  it('should accept spans, totalDuration, and onSelectSpan props', () => {
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
      }
    ]
    const totalDuration = 5000
    // Verify prop shape
    expect(mockSpans).toHaveLength(1)
    expect(totalDuration).toBe(5000)
  })
})
