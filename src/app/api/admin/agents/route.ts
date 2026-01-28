import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { agentSession } from '@/lib/db/schema'
import { eq, sql, max } from 'drizzle-orm'

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
    const agentOSUrl = process.env.NEXT_PUBLIC_AGENT_OS_URL
    let agentsFromBackend: Array<{
      agent_id?: string
      id?: string
      name: string
      model?: { name?: string; model?: string; provider?: string }
    }> = []

    if (agentOSUrl) {
      try {
        const response = await fetch(`${agentOSUrl}/agents`)
        if (response.ok) {
          agentsFromBackend = await response.json()
        }
      } catch {
        // AgentOS unavailable
      }
    }

    const sessionStats = await db
      .select({
        entityId: agentSession.entityId,
        totalSessions: sql<number>`count(*)`,
        activeSessions: sql<number>`count(*) filter (where ${agentSession.status} = 'active')`,
        lastUsed: max(agentSession.updatedAt)
      })
      .from(agentSession)
      .where(eq(agentSession.entityType, 'agent'))
      .groupBy(agentSession.entityId)

    const statsMap = new Map(sessionStats.map((s) => [s.entityId, s]))

    const agents = agentsFromBackend.map((agent) => {
      const agentId = agent.agent_id || agent.id || ''
      return {
        id: agentId,
        name: agent.name,
        model: agent.model,
        sessionStats: {
          total: statsMap.get(agentId)?.totalSessions ?? 0,
          active: statsMap.get(agentId)?.activeSessions ?? 0,
          lastUsed: statsMap.get(agentId)?.lastUsed ?? null
        }
      }
    })

    return NextResponse.json({ agents })
  } catch (error) {
    console.error('Failed to fetch agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}
