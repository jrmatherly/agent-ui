import { beforeAll, afterAll, afterEach, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

// Mock fetch globally
global.fetch = vi.fn()

beforeAll(() => {
  // Setup before all tests
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

afterAll(() => {
  // Cleanup after all tests
})
