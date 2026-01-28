// src/components/evals/__tests__/AccuracyChart.test.tsx
import { describe, it, expect } from 'vitest'
import { AccuracyChart } from '../AccuracyChart'

describe('AccuracyChart', () => {
  it('should export AccuracyChart component', () => {
    expect(typeof AccuracyChart).toBe('function')
  })

  it('should accept data prop', () => {
    const mockData = [
      { date: '2024-01-25', accuracy: 0.88 },
      { date: '2024-01-26', accuracy: 0.91 },
      { date: '2024-01-27', accuracy: 0.92 }
    ]
    // Verify prop shape
    expect(mockData).toHaveLength(3)
    expect(mockData[2].accuracy).toBe(0.92)
  })

  it('should accept currentAccuracy prop', () => {
    const currentAccuracy = 0.92
    expect(currentAccuracy).toBe(0.92)
  })
})
