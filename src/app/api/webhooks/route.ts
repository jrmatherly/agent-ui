import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { webhookService } from '@/lib/webhooks/service'
import { CreateWebhookSchema } from '@/lib/webhooks/types'
import { logAuditEvent } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const webhooks = await webhookService.list({
    orgId: session.session.activeOrganizationId!,
    teamIds: [], // TODO: Get user's team memberships
    buId: undefined
  })

  return NextResponse.json(webhooks)
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = CreateWebhookSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const webhook = await webhookService.create(parsed.data, {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!
  })

  await logAuditEvent({
    actorId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    actorRole: session.user.role ?? undefined,
    orgId: session.session.activeOrganizationId!,
    action: 'webhook.create',
    category: 'configuration',
    resourceType: 'webhook',
    resourceId: webhook.id,
    resourceName: webhook.name,
    outcome: 'success'
  })

  return NextResponse.json(webhook, { status: 201 })
}
