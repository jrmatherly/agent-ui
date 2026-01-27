import { z } from 'zod'

export const UserProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  image: z.string().nullable(),
  department: z.string().nullable(),
  jobTitle: z.string().nullable(),
  manager: z.string().nullable(),
  phone: z.string().nullable(),
  employeeId: z.string().nullable(),
  location: z.string().nullable(),
  ssoProvider: z.string().nullable(),
  ssoLastSync: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type UserProfile = z.infer<typeof UserProfileSchema>

export const UpdateUserProfileSchema = z.object({
  name: z.string().min(1).optional(),
  image: z.string().url().optional(),
  phone: z.string().optional(),
  location: z.string().optional()
})

export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>

export interface SSOAttributes {
  department?: string
  jobTitle?: string
  manager?: string
  phone?: string
  employeeId?: string
  location?: string
  groups?: string[]
  [key: string]: unknown
}
