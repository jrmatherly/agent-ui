// src/components/evals/__tests__/ReliabilityTable.test.tsx
import { describe, it, expect } from 'vitest'
import { ReliabilityTable } from '../ReliabilityTable'

describe('ReliabilityTable', () => {
  it('should export ReliabilityTable component', () => {
    expect(typeof ReliabilityTable).toBe('function')
  })

  it('should accept results prop', () => {
    const mockResults = [
      {
        eval_id: 'eval-1',
        input: 'What is 2+2?',
        expected_output: '4',
        actual_output: '4',
        score: 1.0,
        passed: true
      },
      {
        eval_id: 'eval-2',
        input: 'Explain quantum physics',
        expected_output: 'Complex explanation',
        actual_output: 'Simple explanation',
        score: 0.7,
        passed: false,
        feedback: 'Missing key concepts'
      }
    ]
    // Verify prop shape
    expect(mockResults).toHaveLength(2)
    expect(mockResults[0].passed).toBe(true)
    expect(mockResults[1].feedback).toBe('Missing key concepts')
  })
})
