import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { knowledgeService } from '@/lib/knowledge/service'
import { createKnowledgeClient } from '@/lib/knowledge/agentosClient'
import { logAuditEvent } from '@/lib/audit'

export async function POST(
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

  // Get KB and verify access
  const kb = await knowledgeService.getById(id, context)
  if (!kb) {
    return NextResponse.json(
      { error: 'Knowledge base not found' },
      { status: 404 }
    )
  }

  // Get upload metadata for scoping
  const metadata = await knowledgeService.getUploadMetadata(id, context)
  if (!metadata) {
    return NextResponse.json(
      { error: 'Failed to get upload metadata' },
      { status: 500 }
    )
  }

  // Parse multipart form data
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const name = formData.get('name') as string | null
  const description = formData.get('description') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Get AgentOS endpoint from env or request
  const agentOSUrl =
    process.env.NEXT_PUBLIC_AGENT_OS_URL ?? 'http://localhost:8000'
  const client = createKnowledgeClient(agentOSUrl, session.session.token)

  try {
    // Upload to AgentOS
    const result = await client.uploadDocument(file, metadata, {
      name: name ?? undefined,
      description: description ?? undefined
    })

    // Update KB stats
    await knowledgeService.updateDocumentStats(id, 1, file.size)

    await logAuditEvent({
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: session.user.role ?? undefined,
      orgId: context.orgId,
      action: 'knowledge_base.document.upload',
      category: 'data_access',
      resourceType: 'document',
      resourceId: result.id,
      resourceName: file.name,
      outcome: 'success',
      detail: { kbId: id, size: file.size }
    })

    return NextResponse.json(result, { status: 202 })
  } catch (error) {
    await logAuditEvent({
      actorId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      actorRole: session.user.role ?? undefined,
      orgId: context.orgId,
      action: 'knowledge_base.document.upload',
      category: 'data_access',
      resourceType: 'document',
      resourceName: file.name,
      outcome: 'failure',
      detail: { kbId: id, error: String(error) }
    })

    return NextResponse.json(
      { error: 'Upload failed', details: String(error) },
      { status: 500 }
    )
  }
}
