import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ssoProviderService } from '@/lib/sso/providerService'
import {
  OIDCProviderConfigSchema,
  SAMLProviderConfigSchema
} from '@/lib/sso/types'
import { logAuditEvent } from '@/lib/audit/logger'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['orgAdmin', 'globalAdmin'].includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const providers = await ssoProviderService.listProviders(
    session.session.activeOrganizationId!
  )

  return NextResponse.json(providers)
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['orgAdmin', 'globalAdmin'].includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { type, ...config } = body

  const context = {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!
  }

  try {
    let provider

    if (type === 'oidc') {
      const validated = OIDCProviderConfigSchema.parse(config)
      provider = await ssoProviderService.registerOIDCProvider(
        validated,
        context
      )
    } else if (type === 'saml') {
      const validated = SAMLProviderConfigSchema.parse(config)
      provider = await ssoProviderService.registerSAMLProvider(
        validated,
        context
      )
    } else {
      return NextResponse.json(
        { error: 'Invalid provider type' },
        { status: 400 }
      )
    }

    await logAuditEvent({
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: session.user.role ?? 'user',
      orgId: context.orgId,
      action: 'sso_provider.create',
      category: 'configuration',
      severity: 'critical',
      resourceType: 'sso_provider',
      resourceId: provider.id,
      resourceName: provider.name,
      outcome: 'success',
      detail: { type }
    })

    return NextResponse.json(provider, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create provider', details: String(error) },
      { status: 500 }
    )
  }
}
