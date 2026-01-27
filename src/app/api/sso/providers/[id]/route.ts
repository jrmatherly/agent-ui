import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ssoProviderService } from '@/lib/sso/providerService'
import { logAuditEvent } from '@/lib/audit/logger'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['orgAdmin', 'globalAdmin'].includes(session.user.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const orgId = session.session.activeOrganizationId!

  try {
    await ssoProviderService.deleteProvider(id, orgId)

    await logAuditEvent({
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: session.user.role ?? 'user',
      orgId,
      action: 'sso_provider.delete',
      category: 'configuration',
      severity: 'critical',
      resourceType: 'sso_provider',
      resourceId: id,
      resourceName: id,
      outcome: 'success'
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete provider', details: String(error) },
      { status: 500 }
    )
  }
}
