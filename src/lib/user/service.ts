import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type { SSOAttributes, UserProfile, UpdateUserProfile } from './types'

export class UserProfileService {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const result = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        department: user.department,
        jobTitle: user.jobTitle,
        manager: user.manager,
        phone: user.phone,
        employeeId: user.employeeId,
        location: user.location,
        ssoProvider: user.ssoProvider,
        ssoLastSync: user.ssoLastSync,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1)

    return result[0] ?? null
  }

  async updateProfile(
    userId: string,
    data: UpdateUserProfile
  ): Promise<UserProfile | null> {
    await db
      .update(user)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(user.id, userId))

    return this.getProfile(userId)
  }

  async syncSSOAttributes(
    userId: string,
    attributes: SSOAttributes,
    providerId: string
  ): Promise<void> {
    await db
      .update(user)
      .set({
        department: attributes.department ?? null,
        jobTitle: attributes.jobTitle ?? null,
        manager: attributes.manager ?? null,
        phone: attributes.phone ?? null,
        employeeId: attributes.employeeId ?? null,
        location: attributes.location ?? null,
        ssoMetadata: attributes,
        ssoProvider: providerId,
        ssoLastSync: new Date(),
        updatedAt: new Date()
      })
      .where(eq(user.id, userId))
  }
}

export const userProfileService = new UserProfileService()
