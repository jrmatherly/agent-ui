import { beforeAll, afterAll, afterEach, vi } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

beforeAll(() => {
  // Setup before all tests
})

afterEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  // Cleanup after all tests
})
