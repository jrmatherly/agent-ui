import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditEvent } from '@/lib/db/schema'
import { desc, eq, like, or, sql, and } from 'drizzle-orm'

const ADMIN_ROLES = ['orgAdmin', 'globalAdmin']

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = (session.user as { role?: string }).role
  if (!userRole || !ADMIN_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const severity = searchParams.get('severity')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  try {
    const conditions = []
    if (category && category !== 'all') {
      conditions.push(eq(auditEvent.category, category))
    }
    if (severity && severity !== 'all') {
      conditions.push(eq(auditEvent.severity, severity))
    }
    if (search) {
      conditions.push(
        or(
          like(auditEvent.actorEmail, `%${search}%`),
          like(auditEvent.action, `%${search}%`),
          like(auditEvent.resourceName, `%${search}%`)
        )
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditEvent)
      .where(whereClause)
    const total = countResult?.count ?? 0

    const logs = await db
      .select({
        id: auditEvent.id,
        timestamp: auditEvent.timestamp,
        actorType: auditEvent.actorType,
        actorId: auditEvent.actorId,
        actorEmail: auditEvent.actorEmail,
        actorRole: auditEvent.actorRole,
        action: auditEvent.action,
        category: auditEvent.category,
        severity: auditEvent.severity,
        resourceType: auditEvent.resourceType,
        resourceId: auditEvent.resourceId,
        resourceName: auditEvent.resourceName,
        outcome: auditEvent.outcome,
        elevated: auditEvent.elevated
      })
      .from(auditEvent)
      .where(whereClause)
      .orderBy(desc(auditEvent.timestamp))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({
      logs,
      total,
      hasMore: offset + logs.length < total
    })
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
