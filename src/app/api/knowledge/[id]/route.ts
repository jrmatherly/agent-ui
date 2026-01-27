import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { knowledgeService } from '@/lib/knowledge/service'
import { UpdateKnowledgeBaseSchema } from '@/lib/knowledge/types'
import { logAuditEvent } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const context = {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!
  }

  const kb = await knowledgeService.getById(id, context)
  if (!kb) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(kb)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = UpdateKnowledgeBaseSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const context = {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!
  }

  const kb = await knowledgeService.update(id, parsed.data, context)

  await logAuditEvent({
    actorId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    actorRole: session.user.role ?? undefined,
    orgId: context.orgId,
    action: 'knowledge_base.update',
    category: 'data_access',
    resourceType: 'knowledge_base',
    resourceId: kb.id,
    resourceName: kb.name,
    outcome: 'success'
  })

  return NextResponse.json(kb)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const context = {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!
  }

  const kb = await knowledgeService.getById(id, context)
  if (!kb) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // TODO: Delete documents from Agno first
  await knowledgeService.delete(id, context)

  await logAuditEvent({
    actorId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    actorRole: session.user.role ?? undefined,
    orgId: context.orgId,
    action: 'knowledge_base.delete',
    category: 'data_access',
    resourceType: 'knowledge_base',
    resourceId: id,
    resourceName: kb.name,
    outcome: 'success'
  })

  return new NextResponse(null, { status: 204 })
}
