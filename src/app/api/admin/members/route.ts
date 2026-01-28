import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user, session } from '@/lib/db/schema'
import { desc, eq, like, or, sql, and, max } from 'drizzle-orm'

const ADMIN_ROLES = ['orgAdmin', 'globalAdmin']

export async function GET(request: NextRequest) {
  const authSession = await auth.api.getSession({ headers: request.headers })

  if (!authSession?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = (authSession.user as { role?: string }).role
  if (!userRole || !ADMIN_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const role = searchParams.get('role')
  const ssoOnly = searchParams.get('sso') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  try {
    const conditions = []
    if (search) {
      conditions.push(
        or(like(user.name, `%${search}%`), like(user.email, `%${search}%`))
      )
    }
    if (role && role !== 'all') {
      conditions.push(
        eq(
          user.role,
          role as
            | 'user'
            | 'powerUser'
            | 'teamLead'
            | 'teamAdmin'
            | 'orgAdmin'
            | 'globalAdmin'
        )
      )
    }
    if (ssoOnly) {
      conditions.push(sql`${user.ssoProvider} IS NOT NULL`)
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereClause)
    const total = countResult?.count ?? 0

    const members = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        jobTitle: user.jobTitle,
        ssoProvider: user.ssoProvider,
        ssoLastSync: user.ssoLastSync,
        banned: user.banned,
        createdAt: user.createdAt,
        image: user.image
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset)

    const userIds = members.map((m) => m.id)
    const lastActiveTimes =
      userIds.length > 0
        ? await db
            .select({
              userId: session.userId,
              lastActive: max(session.createdAt)
            })
            .from(session)
            .where(sql`${session.userId} IN ${userIds}`)
            .groupBy(session.userId)
        : []

    const lastActiveMap = new Map(
      lastActiveTimes.map((r) => [r.userId, r.lastActive])
    )

    const membersWithActivity = members.map((m) => ({
      ...m,
      lastActiveAt: lastActiveMap.get(m.id) || null
    }))

    return NextResponse.json({
      members: membersWithActivity,
      total,
      page,
      limit
    })
  } catch (error) {
    console.error('Failed to fetch members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
