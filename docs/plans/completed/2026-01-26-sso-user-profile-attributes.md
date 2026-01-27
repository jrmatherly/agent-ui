# SSO User Profile Attributes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Store SSO attributes (department, job title, manager, etc.) from identity providers in the user database for display on user profile pages, without including them in session tokens.

**Architecture:** Extend the user table with explicit columns for common profile fields plus a JSONB column for overflow. Update the SSO `provisionUser` callback to sync attributes on each login. Create a user profile API endpoint and React component for displaying the data.

**Tech Stack:** Better Auth SSO, Drizzle ORM, PostgreSQL JSONB, React Query, Next.js API Routes

---

## Task 1: Extend User Schema with Profile Fields

**Files:**

- Modify: `src/lib/db/schema.ts:35-48`

**Step 1: Add profile columns to user table**

Add the following columns after the existing `banExpires` field in the `user` table definition:

```typescript
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // Enterprise extensions
  role: roleEnum('role').notNull().default('user'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  // SSO Profile attributes
  department: text('department'),
  jobTitle: text('job_title'),
  manager: text('manager'),
  phone: text('phone'),
  employeeId: text('employee_id'),
  location: text('location'),
  ssoMetadata: jsonb('sso_metadata'),
  ssoProvider: text('sso_provider'),
  ssoLastSync: timestamp('sso_last_sync')
})
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/db/schema.ts
git commit -m "feat(schema): add SSO profile attributes to user table"
```

---

## Task 2: Create User Profile Types

**Files:**

- Create: `src/lib/user/types.ts`

**Step 1: Create the types file**

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/user/types.ts
git commit -m "feat(user): add user profile type definitions"
```

---

## Task 3: Create User Profile Service

**Files:**

- Create: `src/lib/user/service.ts`

**Step 1: Create the service file**

```typescript
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
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/user/service.ts
git commit -m "feat(user): add user profile service with SSO sync"
```

---

## Task 4: Create Index Export for User Module

**Files:**

- Create: `src/lib/user/index.ts`

**Step 1: Create the index file**

```typescript
export * from './types'
export * from './service'
```

**Step 2: Commit**

```bash
git add src/lib/user/index.ts
git commit -m "feat(user): add module index export"
```

---

## Task 5: Update SSO Provider Types for Extra Fields

**Files:**

- Modify: `src/lib/sso/types.ts:10-11,21-22`

**Step 1: Update extraFields type to be more specific**

Change the `extraFields` in both `OIDCAttributeMapping` and `SAMLAttributeMapping` from `z.any()` to a specific type:

```typescript
// OIDC attribute mapping - id, email, name are required by Better Auth
export const OIDCAttributeMapping = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  name: z.string().min(1),
  emailVerified: z.string().optional(),
  image: z.string().optional(),
  extraFields: z
    .object({
      department: z.string().optional(),
      jobTitle: z.string().optional(),
      manager: z.string().optional(),
      phone: z.string().optional(),
      employeeId: z.string().optional(),
      location: z.string().optional()
    })
    .optional()
})

// SAML attribute mapping - id, email, name are required by Better Auth
export const SAMLAttributeMapping = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  name: z.string().min(1),
  emailVerified: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  extraFields: z
    .object({
      department: z.string().optional(),
      jobTitle: z.string().optional(),
      manager: z.string().optional(),
      phone: z.string().optional(),
      employeeId: z.string().optional(),
      location: z.string().optional()
    })
    .optional()
})
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/sso/types.ts
git commit -m "feat(sso): add typed extraFields for profile attributes"
```

---

## Task 6: Update Auth Configuration to Sync SSO Attributes

**Files:**

- Modify: `src/lib/auth.ts:57-65`

**Step 1: Update provisionUser callback**

Replace the existing `provisionUser` callback with one that syncs SSO attributes:

```typescript
import { userProfileService } from '@/lib/user'

// ... existing code ...

    sso({
      // Organization provisioning - auto-add users to org on SSO login
      organizationProvisioning: {
        disabled: false,
        defaultRole: 'member',
        getRole: async ({ userInfo }) => {
          // Map groups to roles based on provider configuration
          const groups = userInfo.groups as string[] | undefined
          if (!groups) return 'member'

          // Check for admin groups
          if (groups.some((g) => /admin|owner|lead/i.test(g))) {
            return 'admin'
          }

          return 'member'
        }
      },

      // User provisioning callback - sync SSO attributes to user profile
      provisionUser: async ({ user, userInfo, provider }) => {
        console.log(
          `SSO user provisioned: ${user.email} via ${provider.providerId}`
        )

        // Extract attributes from userInfo
        const attributes = {
          department: userInfo.attributes?.department as string | undefined,
          jobTitle: userInfo.attributes?.jobTitle as string | undefined,
          manager: userInfo.attributes?.manager as string | undefined,
          phone: userInfo.attributes?.phone as string | undefined,
          employeeId: userInfo.attributes?.employeeId as string | undefined,
          location: userInfo.attributes?.location as string | undefined,
          groups: userInfo.groups as string[] | undefined
        }

        // Sync to user profile
        await userProfileService.syncSSOAttributes(
          user.id,
          attributes,
          provider.providerId
        )
      }
    })
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat(sso): sync SSO attributes to user profile on login"
```

---

## Task 7: Create User Profile API Endpoint

**Files:**

- Create: `src/app/api/users/[id]/profile/route.ts`

**Step 1: Create the directory structure and route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { userProfileService } from '@/lib/user'
import { UpdateUserProfileSchema } from '@/lib/user/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Users can only view their own profile unless they're admin
  const isAdmin = ['orgAdmin', 'globalAdmin'].includes(
    (session.user as { role?: string }).role || ''
  )
  if (session.user.id !== id && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const profile = await userProfileService.getProfile(id)

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(profile)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Users can only update their own profile
  if (session.user.id !== id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = UpdateUserProfileSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const profile = await userProfileService.updateProfile(id, parsed.data)

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json(profile)
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/api/users/
git commit -m "feat(api): add user profile GET and PATCH endpoints"
```

---

## Task 8: Create User Profile Hook

**Files:**

- Create: `src/hooks/useUserProfile.ts`

**Step 1: Create the hook file**

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserProfile, UpdateUserProfile } from '@/lib/user/types'

async function fetchUserProfile(userId: string): Promise<UserProfile> {
  const response = await fetch(`/api/users/${userId}/profile`)
  if (!response.ok) {
    throw new Error('Failed to fetch user profile')
  }
  return response.json()
}

async function updateUserProfile(
  userId: string,
  data: UpdateUserProfile
): Promise<UserProfile> {
  const response = await fetch(`/api/users/${userId}/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    throw new Error('Failed to update user profile')
  }
  return response.json()
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId
  })
}

export function useUpdateUserProfile(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateUserProfile) => updateUserProfile(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] })
    }
  })
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/hooks/useUserProfile.ts
git commit -m "feat(hooks): add useUserProfile hook with React Query"
```

---

## Task 9: Create User Profile Component

**Files:**

- Create: `src/components/user/UserProfile.tsx`

**Step 1: Create the component file**

```typescript
'use client'

import { useUserProfile } from '@/hooks/useUserProfile'
import { useAuth } from '@/components/providers/AuthProvider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Building2,
  Briefcase,
  User,
  Phone,
  MapPin,
  BadgeCheck,
  Clock
} from 'lucide-react'

interface UserProfileProps {
  userId?: string
}

export function UserProfile({ userId }: UserProfileProps) {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  const { data: profile, isLoading, error } = useUserProfile(targetUserId || '')

  if (!targetUserId) {
    return <div className="text-muted-foreground">Not authenticated</div>
  }

  if (isLoading) {
    return <UserProfileSkeleton />
  }

  if (error || !profile) {
    return (
      <div className="text-destructive">Failed to load profile</div>
    )
  }

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.image || undefined} alt={profile.name} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-xl">{profile.name}</CardTitle>
            <p className="text-muted-foreground">{profile.email}</p>
            {profile.ssoProvider && (
              <Badge variant="secondary" className="mt-2">
                <BadgeCheck className="h-3 w-3 mr-1" />
                SSO: {profile.ssoProvider}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.jobTitle && (
          <ProfileField
            icon={<Briefcase className="h-4 w-4" />}
            label="Job Title"
            value={profile.jobTitle}
          />
        )}
        {profile.department && (
          <ProfileField
            icon={<Building2 className="h-4 w-4" />}
            label="Department"
            value={profile.department}
          />
        )}
        {profile.manager && (
          <ProfileField
            icon={<User className="h-4 w-4" />}
            label="Manager"
            value={profile.manager}
          />
        )}
        {profile.phone && (
          <ProfileField
            icon={<Phone className="h-4 w-4" />}
            label="Phone"
            value={profile.phone}
          />
        )}
        {profile.location && (
          <ProfileField
            icon={<MapPin className="h-4 w-4" />}
            label="Location"
            value={profile.location}
          />
        )}
        {profile.employeeId && (
          <ProfileField
            icon={<BadgeCheck className="h-4 w-4" />}
            label="Employee ID"
            value={profile.employeeId}
          />
        )}
        {profile.ssoLastSync && (
          <ProfileField
            icon={<Clock className="h-4 w-4" />}
            label="Last SSO Sync"
            value={new Date(profile.ssoLastSync).toLocaleString()}
          />
        )}
      </CardContent>
    </Card>
  )
}

function ProfileField({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function UserProfileSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/user/
git commit -m "feat(ui): add UserProfile component"
```

---

## Task 10: Create User Profile Page

**Files:**

- Create: `src/app/(enterprise)/profile/page.tsx`
- Create: `src/app/(enterprise)/profile/layout.tsx`

**Step 1: Create the layout file**

```typescript
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export default async function ProfileLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) {
    redirect('/login')
  }

  return <>{children}</>
}
```

**Step 2: Create the page file**

```typescript
import { UserProfile } from '@/components/user/UserProfile'

export default function ProfilePage() {
  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>
      <UserProfile />
    </div>
  )
}
```

**Step 3: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/\(enterprise\)/profile/
git commit -m "feat(page): add user profile page"
```

---

## Task 11: Add Unit Tests for User Profile Service

**Files:**

- Create: `src/__tests__/user-profile.test.ts`

**Step 1: Create the test file**

```typescript
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
```

**Step 2: Run tests**

Run: `pnpm test src/__tests__/user-profile.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/__tests__/user-profile.test.ts
git commit -m "test(user): add unit tests for user profile service"
```

---

## Task 12: Run Full Validation and Final Commit

**Step 1: Run full validation**

Run: `pnpm validate`
Expected: All checks pass (lint, format, typecheck)

**Step 2: Fix any formatting issues**

Run: `pnpm format:fix`

**Step 3: Run all tests**

Run: `pnpm test`
Expected: All tests pass

**Step 4: Create final commit if any files changed**

```bash
git add -A
git commit -m "chore: formatting and cleanup for SSO profile attributes"
```

---

## Summary

This implementation provides:

1. **Database Schema** - Extended user table with profile columns + JSONB overflow
2. **Type Safety** - Zod schemas and TypeScript types for all profile data
3. **SSO Sync** - Automatic attribute sync on each SSO login via `provisionUser`
4. **API Endpoints** - GET/PATCH for user profile with proper authorization
5. **React Hook** - `useUserProfile` with React Query for data fetching
6. **UI Component** - `UserProfile` card displaying all available attributes
7. **Profile Page** - Protected page at `/profile` for viewing own profile
8. **Tests** - Unit tests for the profile service

**Profile attributes stored:**

- `department` - User's department
- `jobTitle` - Job title/position
- `manager` - Direct manager's name
- `phone` - Phone number
- `employeeId` - Employee ID from HR system
- `location` - Office location
- `ssoMetadata` - Raw JSONB of all SSO attributes (for debugging/audit)
- `ssoProvider` - Which SSO provider authenticated the user
- `ssoLastSync` - When attributes were last synced

**Not in token:** These attributes are stored in the database only and fetched via API when needed. The session token remains lightweight with just id, email, name, and role.
