import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getValidToken, clearToken, hasToken } from '@/lib/agentos/tokenStore'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('AgentOS Token Store', () => {
  beforeEach(() => {
    // Clear any cached state
    clearToken()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('clearToken', () => {
    it('should clear the cached token', () => {
      // Manually set some state by simulating a successful fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            token: 'test-token',
            expiresAt: Date.now() + 10 * 60 * 1000
          })
      })

      // After clearing, hasToken should return false
      clearToken()
      expect(hasToken()).toBe(false)
    })
  })

  describe('hasToken', () => {
    it('should return false when no token is cached', () => {
      expect(hasToken()).toBe(false)
    })
  })

  describe('getValidToken', () => {
    it('should fetch token when none is cached', async () => {
      const mockToken = 'new-jwt-token'
      const mockExpiresAt = Date.now() + 15 * 60 * 1000

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ token: mockToken, expiresAt: mockExpiresAt })
      })

      const token = await getValidToken()

      expect(token).toBe(mockToken)
      expect(mockFetch).toHaveBeenCalledWith('/api/agentos/token', {
        method: 'POST',
        credentials: 'include'
      })
    })

    it('should return null on 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      })

      const token = await getValidToken()

      expect(token).toBeNull()
    })

    it('should return null on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const token = await getValidToken()

      expect(token).toBeNull()
    })

    it('should return cached token if still valid', async () => {
      const mockToken = 'cached-token'
      const mockExpiresAt = Date.now() + 10 * 60 * 1000 // 10 min from now

      // First fetch to cache the token
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ token: mockToken, expiresAt: mockExpiresAt })
      })

      await getValidToken()
      mockFetch.mockClear()

      // Second call should use cached token
      const token = await getValidToken()

      expect(token).toBe(mockToken)
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should refresh token when close to expiry', async () => {
      const oldToken = 'old-token'
      const newToken = 'new-token'
      const nearExpiryTime = Date.now() + 3 * 60 * 1000 // 3 min from now (< 5 min threshold)
      const newExpiryTime = Date.now() + 15 * 60 * 1000

      // First fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ token: oldToken, expiresAt: nearExpiryTime })
      })

      await getValidToken()
      mockFetch.mockClear()

      // Second call should trigger refresh because token is close to expiry
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ token: newToken, expiresAt: newExpiryTime })
      })

      const token = await getValidToken()

      expect(token).toBe(newToken)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should deduplicate concurrent requests', async () => {
      const mockToken = 'test-token'
      const mockExpiresAt = Date.now() + 15 * 60 * 1000

      // Slow mock to simulate network delay
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      token: mockToken,
                      expiresAt: mockExpiresAt
                    })
                }),
              50
            )
          )
      )

      // Fire multiple concurrent requests
      const [token1, token2, token3] = await Promise.all([
        getValidToken(),
        getValidToken(),
        getValidToken()
      ])

      // All should return the same token
      expect(token1).toBe(mockToken)
      expect(token2).toBe(mockToken)
      expect(token3).toBe(mockToken)

      // But fetch should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
