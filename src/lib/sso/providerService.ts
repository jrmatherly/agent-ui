import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type {
  OIDCProviderConfig,
  SAMLProviderConfig,
  SSOProvider
} from './types'
import { OIDCProviderConfigSchema, SAMLProviderConfigSchema } from './types'

// Default OIDC mapping values
const DEFAULT_OIDC_MAPPING = {
  id: 'sub',
  email: 'email',
  name: 'name'
}

// Default SAML mapping values
const DEFAULT_SAML_MAPPING = {
  id: 'nameID',
  email: 'email',
  name: 'displayName'
}

export class SSOProviderService {
  async registerOIDCProvider(
    config: OIDCProviderConfig,
    context: { userId: string; orgId: string }
  ): Promise<SSOProvider> {
    const validated = OIDCProviderConfigSchema.parse(config)

    // Use default mapping if not provided
    const mapping = validated.attributeMapping ?? DEFAULT_OIDC_MAPPING

    // Register with Better Auth SSO plugin
    await auth.api.registerSSOProvider({
      body: {
        providerId: validated.providerId,
        issuer: validated.issuer,
        domain: validated.domain,
        organizationId: validated.organizationId || context.orgId,
        oidcConfig: {
          clientId: validated.clientId,
          clientSecret: validated.clientSecret,
          discoveryEndpoint: validated.discoveryEndpoint,
          scopes: validated.scopes,
          pkce: validated.pkce,
          mapping
        }
      },
      headers: new Headers()
    })

    return {
      id: validated.providerId,
      type: 'oidc',
      name: validated.name,
      providerId: validated.providerId,
      organizationId: validated.organizationId || context.orgId,
      domain: validated.domain,
      enabled: true,
      config: validated,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  async registerSAMLProvider(
    config: SAMLProviderConfig,
    context: { userId: string; orgId: string }
  ): Promise<SSOProvider> {
    const validated = SAMLProviderConfigSchema.parse(config)

    // Use default mapping if not provided
    const mapping = validated.attributeMapping ?? DEFAULT_SAML_MAPPING

    await auth.api.registerSSOProvider({
      body: {
        providerId: validated.providerId,
        issuer: validated.issuer,
        domain: validated.domain,
        organizationId: validated.organizationId || context.orgId,
        samlConfig: {
          entryPoint: validated.entryPoint,
          cert: validated.cert,
          callbackUrl: validated.callbackUrl,
          spMetadata: validated.spMetadata ?? {
            entityID: validated.issuer
          },
          wantAssertionsSigned: validated.wantAssertionsSigned,
          signatureAlgorithm: validated.signatureAlgorithm,
          mapping
        }
      },
      headers: new Headers()
    })

    return {
      id: validated.providerId,
      type: 'saml',
      name: validated.name,
      providerId: validated.providerId,
      organizationId: validated.organizationId || context.orgId,
      domain: validated.domain,
      enabled: true,
      config: validated,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  async listProviders(orgId: string): Promise<SSOProvider[]> {
    // Query SSO providers directly from the database
    // Better Auth stores them in 'ssoProvider' table by default
    try {
      const providers = await db.execute<{
        providerId: string
        issuer: string
        domain: string
        organizationId: string
        oidcConfig: Record<string, unknown> | null
        samlConfig: Record<string, unknown> | null
        createdAt: string
        updatedAt: string
      }>(sql`SELECT * FROM "ssoProvider" WHERE "organizationId" = ${orgId}`)

      return providers.map((p) => ({
        id: p.providerId,
        type: p.oidcConfig ? ('oidc' as const) : ('saml' as const),
        name: p.providerId,
        providerId: p.providerId,
        organizationId: p.organizationId,
        domain: p.domain,
        enabled: true,
        config: (p.oidcConfig ?? p.samlConfig) as
          | OIDCProviderConfig
          | SAMLProviderConfig,
        createdAt: new Date(p.createdAt || Date.now()),
        updatedAt: new Date(p.updatedAt || Date.now())
      }))
    } catch (error) {
      // Table might not exist yet
      console.warn('Failed to list SSO providers:', error)
      return []
    }
  }

  async deleteProvider(providerId: string, orgId: string): Promise<void> {
    // Delete directly from database
    await db.execute(
      sql`DELETE FROM "ssoProvider" WHERE "providerId" = ${providerId} AND "organizationId" = ${orgId}`
    )
  }

  async getEnabledProviders(): Promise<
    Array<{ id: string; name: string; type: 'oidc' | 'saml' }>
  > {
    try {
      const providers = await db.execute<{
        providerId: string
        oidcConfig: Record<string, unknown> | null
      }>(sql`SELECT "providerId", "oidcConfig" FROM "ssoProvider"`)

      return providers.map((p) => ({
        id: p.providerId,
        name: p.providerId,
        type: p.oidcConfig ? ('oidc' as const) : ('saml' as const)
      }))
    } catch (error) {
      console.warn('Failed to get enabled SSO providers:', error)
      return []
    }
  }
}

export const ssoProviderService = new SSOProviderService()
