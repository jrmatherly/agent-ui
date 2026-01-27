import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserProfileService } from '@/lib/user/service'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([]))
        }))
      }))
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve())
      }))
    }))
  }
}))

describe('UserProfileService', () => {
  let service: UserProfileService

  beforeEach(() => {
    service = new UserProfileService()
    vi.clearAllMocks()
  })

  describe('getProfile', () => {
    it('should return null for non-existent user', async () => {
      const result = await service.getProfile('non-existent-id')
      expect(result).toBeNull()
    })
  })

  describe('syncSSOAttributes', () => {
    it('should sync attributes without throwing', async () => {
      const attributes = {
        department: 'Engineering',
        jobTitle: 'Software Engineer',
        manager: 'John Doe'
      }

      await expect(
        service.syncSSOAttributes('user-id', attributes, 'okta')
      ).resolves.not.toThrow()
    })

    it('should handle empty attributes', async () => {
      await expect(
        service.syncSSOAttributes('user-id', {}, 'okta')
      ).resolves.not.toThrow()
    })
  })
})
