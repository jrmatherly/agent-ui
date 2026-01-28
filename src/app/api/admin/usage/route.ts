import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user, agentSession, knowledgeBase } from '@/lib/db/schema'
import { sql, gte } from 'drizzle-orm'

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

  try {
    const now = new Date()
    const today = new Date(now.setHours(0, 0, 0, 0))
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [totalSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentSession)

    const [todaySessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentSession)
      .where(gte(agentSession.createdAt, today))

    const [weekSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentSession)
      .where(gte(agentSession.createdAt, weekAgo))

    const [monthSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentSession)
      .where(gte(agentSession.createdAt, monthAgo))

    const byEntityType = await db
      .select({
        entityType: agentSession.entityType,
        count: sql<number>`count(*)`
      })
      .from(agentSession)
      .groupBy(agentSession.entityType)

    const [avgMessages] = await db
      .select({ avg: sql<number>`avg(${agentSession.messageCount})` })
      .from(agentSession)

    const [totalUsers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
    const [newUsersWeek] = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(gte(user.createdAt, weekAgo))

    const roleDistribution = await db
      .select({
        role: user.role,
        count: sql<number>`count(*)`
      })
      .from(user)
      .groupBy(user.role)

    const [kbMetrics] = await db
      .select({
        totalBases: sql<number>`count(*)`,
        totalDocuments: sql<number>`coalesce(sum(${knowledgeBase.documentCount}), 0)`,
        totalSizeBytes: sql<number>`coalesce(sum(${knowledgeBase.totalSizeBytes}), 0)`
      })
      .from(knowledgeBase)

    return NextResponse.json({
      sessions: {
        total: totalSessions?.count ?? 0,
        today: todaySessions?.count ?? 0,
        thisWeek: weekSessions?.count ?? 0,
        thisMonth: monthSessions?.count ?? 0,
        byEntityType: Object.fromEntries(
          byEntityType.map((r) => [r.entityType, r.count])
        ),
        avgMessageCount: Math.round(avgMessages?.avg ?? 0)
      },
      users: {
        total: totalUsers?.count ?? 0,
        newThisWeek: newUsersWeek?.count ?? 0,
        byRole: Object.fromEntries(
          roleDistribution.map((r) => [r.role, r.count])
        )
      },
      knowledge: {
        totalBases: kbMetrics?.totalBases ?? 0,
        totalDocuments: kbMetrics?.totalDocuments ?? 0,
        totalSizeBytes: kbMetrics?.totalSizeBytes ?? 0
      }
    })
  } catch (error) {
    console.error('Failed to fetch usage metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage metrics' },
      { status: 500 }
    )
  }
}
