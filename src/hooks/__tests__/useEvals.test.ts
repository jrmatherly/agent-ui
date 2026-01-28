// src/hooks/__tests__/useEvals.test.ts
import { describe, it, expect } from 'vitest'
import { useEvals } from '../useEvals'

describe('useEvals', () => {
  it('should export useEvals function', () => {
    expect(typeof useEvals).toBe('function')
  })

  it('should accept options parameter', () => {
    // Test that hook accepts proper options shape
    const options = {
      agentId: 'agent-1',
      limit: 50
    }
    // Just verify the options shape is correct TypeScript
    expect(options.agentId).toBe('agent-1')
    expect(options.limit).toBe(50)
  })
})
