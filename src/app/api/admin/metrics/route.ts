import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user, session } from '@/lib/db/schema'
import { count, sql, gte } from 'drizzle-orm'

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

  try {
    // Get total users count
    const [totalUsersResult] = await db.select({ count: count() }).from(user)
    const totalUsers = totalUsersResult?.count ?? 0

    // Get active users (users with sessions in last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [activeUsersResult] = await db
      .select({ count: sql<number>`count(distinct ${session.userId})` })
      .from(session)
      .where(gte(session.createdAt, twentyFourHoursAgo))
    const activeUsers = activeUsersResult?.count ?? 0

    // Get total sessions (all time)
    const [totalSessionsResult] = await db
      .select({ count: count() })
      .from(session)
    const totalSessions = totalSessionsResult?.count ?? 0

    // Try to get AgentOS metrics if endpoint is configured
    const agentOSMetrics = {
      totalAgents: 0,
      avgSessionDuration: 'N/A',
      errorRate: 'N/A'
    }

    const agentOSUrl = process.env.NEXT_PUBLIC_AGENT_OS_URL
    if (agentOSUrl) {
      try {
        // Get agent count from AgentOS
        const agentsResponse = await fetch(`${agentOSUrl}/agents`, {
          headers: { 'Content-Type': 'application/json' }
        })
        if (agentsResponse.ok) {
          const agents = await agentsResponse.json()
          agentOSMetrics.totalAgents = Array.isArray(agents) ? agents.length : 0
        }

        // Get metrics from AgentOS if available
        const metricsResponse = await fetch(`${agentOSUrl}/metrics`, {
          headers: { 'Content-Type': 'application/json' }
        })
        if (metricsResponse.ok) {
          const metrics = await metricsResponse.json()
          if (metrics.avg_session_duration) {
            agentOSMetrics.avgSessionDuration = formatDuration(
              metrics.avg_session_duration
            )
          }
          if (metrics.error_rate !== undefined) {
            agentOSMetrics.errorRate = `${(metrics.error_rate * 100).toFixed(1)}%`
          }
        }
      } catch {
        // AgentOS not available, use defaults
      }
    }

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalAgents: agentOSMetrics.totalAgents,
      totalSessions,
      avgSessionDuration: agentOSMetrics.avgSessionDuration,
      errorRate: agentOSMetrics.errorRate
    })
  } catch (error) {
    console.error('Failed to fetch admin metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds / 3600)}h`
}
