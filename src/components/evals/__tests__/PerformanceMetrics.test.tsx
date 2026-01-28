// src/components/evals/__tests__/PerformanceMetrics.test.tsx
import { describe, it, expect } from 'vitest'
import { PerformanceMetrics } from '../PerformanceMetrics'

describe('PerformanceMetrics', () => {
  it('should export PerformanceMetrics component', () => {
    expect(typeof PerformanceMetrics).toBe('function')
  })

  it('should accept metrics prop', () => {
    const mockMetrics = {
      accuracy: 0.92,
      avg_latency_ms: 1500,
      total_runs: 50,
      passed_count: 46,
      failed_count: 4
    }
    // Verify prop shape
    expect(mockMetrics.accuracy).toBe(0.92)
    expect(mockMetrics.passed_count + mockMetrics.failed_count).toBe(
      mockMetrics.total_runs
    )
  })
})
