// src/app/(main)/tracing/__tests__/page.test.tsx
import { describe, it, expect, vi } from 'vitest'
import TracingPage from '../page'

vi.mock('@/hooks/useTraces', () => ({
  useTraces: () => ({
    traces: [],
    isLoading: false,
    error: null
  })
}))

describe('TracingPage', () => {
  it('should export TracingPage component', () => {
    expect(typeof TracingPage).toBe('function')
  })
})
