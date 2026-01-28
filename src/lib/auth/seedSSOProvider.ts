import { db } from '@/lib/db'
import { ssoProvider } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { eq } from 'drizzle-orm'

let seeded = false

export async function seedSSOProviderIfNeeded() {
  if (seeded) return

  const clientId = process.env.ENTRA_CLIENT_ID
  const clientSecret = process.env.ENTRA_CLIENT_SECRET
  const tenantId = process.env.ENTRA_TENANT_ID

  if (!clientId || !clientSecret || !tenantId) {
    seeded = true
    return
  }

  // Check if provider already exists
  const existing = await db.query.ssoProvider.findFirst({
    where: eq(ssoProvider.providerId, 'microsoft-entra')
  })

  if (existing) {
    seeded = true
    return
  }

  try {
    // Register the provider via Better Auth API
    await auth.api.registerSSOProvider({
      body: {
        providerId: 'microsoft-entra',
        issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
        domain: process.env.SSO_DOMAIN || 'localhost',
        oidcConfig: {
          clientId,
          clientSecret,
          discoveryEndpoint: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
          scopes: ['openid', 'email', 'profile'],
          pkce: true,
          mapping: {
            id: 'sub',
            email: 'email',
            name: 'name',
            emailVerified: 'email_verified',
            image: 'picture'
          }
        }
      },
      headers: new Headers()
    })

    seeded = true
    console.log('[Auth] Microsoft Entra SSO provider seeded')
  } catch (error) {
    // During build, no auth context exists - silently skip (will seed at runtime)
    const isUnauthorized =
      error instanceof Error &&
      (error.message.includes('UNAUTHORIZED') ||
        (error as { status?: string }).status === 'UNAUTHORIZED')

    if (!isUnauthorized) {
      console.error('[Auth] Failed to seed SSO provider:', error)
    }

    seeded = true // Don't retry on failure
  }
}
