// src/app/(main)/evals/__tests__/page.test.tsx
import { describe, it, expect, vi } from 'vitest'
import EvalsPage from '../page'

vi.mock('@/hooks/useEvals', () => ({
  useEvals: () => ({
    evalRuns: [],
    isLoading: false,
    error: null
  })
}))

describe('EvalsPage', () => {
  it('should export EvalsPage component', () => {
    expect(typeof EvalsPage).toBe('function')
  })
})
