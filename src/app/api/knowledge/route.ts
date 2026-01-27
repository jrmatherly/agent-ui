import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { knowledgeService } from '@/lib/knowledge/service'
import { CreateKnowledgeBaseSchema } from '@/lib/knowledge/types'
import { logAuditEvent } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const context = {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!,
    buId: undefined, // TODO: Get from session
    teamIds: [], // TODO: Get user's team memberships
    role: session.user.role ?? 'user'
  }

  const knowledgeBases = await knowledgeService.list(context)
  return NextResponse.json(knowledgeBases)
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = CreateKnowledgeBaseSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const context = {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!,
    buId: undefined
  }

  try {
    const kb = await knowledgeService.create(parsed.data, context)

    await logAuditEvent({
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: session.user.role ?? undefined,
      orgId: context.orgId,
      action: 'knowledge_base.create',
      category: 'data_access',
      resourceType: 'knowledge_base',
      resourceId: kb.id,
      resourceName: kb.name,
      outcome: 'success'
    })

    return NextResponse.json(kb, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('quota')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    throw error
  }
}
