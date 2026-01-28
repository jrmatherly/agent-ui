import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { session } from '@/lib/db/schema'
import { count } from 'drizzle-orm'

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
    // Get total sessions count (all time)
    const [totalSessionsResult] = await db
      .select({ count: count() })
      .from(session)
    const totalSessions = totalSessionsResult?.count ?? 0

    return NextResponse.json({
      totalSessions
    })
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
