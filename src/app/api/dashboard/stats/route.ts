import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { session } from '@/lib/db/schema'
import { gt, sql } from 'drizzle-orm'

/**
 * GET /api/dashboard/stats
 *
 * Returns basic dashboard statistics for any authenticated user.
 * This is a public endpoint (requires auth but no specific role).
 */
export async function GET(request: NextRequest) {
  const authSession = await auth.api.getSession({ headers: request.headers })

  if (!authSession?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get count of currently active sessions (non-expired, unique users)
    // This represents the number of users currently logged in
    const [activeSessionsResult] = await db
      .select({ count: sql<number>`count(distinct ${session.userId})` })
      .from(session)
      .where(gt(session.expiresAt, new Date()))
    const activeSessions = activeSessionsResult?.count ?? 0

    return NextResponse.json({
      activeSessions
    })
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
