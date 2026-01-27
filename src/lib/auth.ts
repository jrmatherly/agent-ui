import { betterAuth } from 'better-auth'
import { organization, admin } from 'better-auth/plugins'
import { nextCookies } from 'better-auth/next-js'
import { sso } from '@better-auth/sso'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { userProfileService } from '@/lib/user'

// Get base URL from environment, with fallback for development
const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [baseURL],

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema
  }),

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Auto-verify email for seeded admin account
          const adminEmail = process.env.ADMIN_EMAIL
          if (adminEmail && user.email === adminEmail) {
            return {
              data: {
                ...user,
                emailVerified: true
              }
            }
          }
          return { data: user }
        }
      }
    }
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV === 'production'
  },

  session: {
    expiresIn: 60 * 60 * 8, // 8 hours
    updateAge: 60 * 60, // Refresh every hour
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5 // 5 minutes
    }
  },

  plugins: [
    organization({
      teams: {
        enabled: true
      },
      allowUserToCreateOrganization: false
    }),

    admin({
      defaultRole: 'user'
    }),

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
    }),

    // Must be last plugin for Next.js cookie handling
    nextCookies()
  ],

  advanced: {
    database: {
      generateId: () => crypto.randomUUID()
    }
  }
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
