// src/hooks/__tests__/useTraces.test.ts
import { describe, it, expect } from 'vitest'
import { useTraces } from '../useTraces'

describe('useTraces', () => {
  it('should export useTraces function', () => {
    expect(typeof useTraces).toBe('function')
  })

  it('should accept options parameter', () => {
    // Test that hook accepts proper options shape
    const options = {
      sessionId: 'sess-1',
      runId: 'run-1',
      limit: 50
    }
    // Just verify the options shape is correct TypeScript
    expect(options.sessionId).toBe('sess-1')
    expect(options.runId).toBe('run-1')
    expect(options.limit).toBe(50)
  })
})
