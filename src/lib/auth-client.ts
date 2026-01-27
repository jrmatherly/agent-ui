import { createAuthClient } from 'better-auth/react'
import { organizationClient, adminClient } from 'better-auth/client/plugins'
import { ssoClient } from '@better-auth/sso/client'

import { clearToken } from '@/lib/agentos'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  plugins: [
    organizationClient({
      teams: {
        enabled: true
      }
    }),
    adminClient(),
    ssoClient()
  ]
})

// Wrap signOut to clear AgentOS JWT token
const originalSignOut = authClient.signOut
export const signOut: typeof originalSignOut = async (options) => {
  clearToken()
  return originalSignOut(options)
}

export const {
  signIn,
  signUp,
  useSession,
  useActiveOrganization,
  useListOrganizations
} = authClient
