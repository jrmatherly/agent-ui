import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ssoProvider, webhookEndpoint } from '@/lib/db/schema'
import { sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userRole = (session.user as { role?: string }).role
  if (userRole !== 'globalAdmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const agentOSUrl = process.env.NEXT_PUBLIC_AGENT_OS_URL
    let agentOSHealth: {
      status: 'healthy' | 'unhealthy' | 'unknown'
      latency: number
    } = { status: 'unknown', latency: 0 }

    if (agentOSUrl) {
      const start = Date.now()
      try {
        const response = await fetch(`${agentOSUrl}/health`, {
          signal: AbortSignal.timeout(5000)
        })
        agentOSHealth = {
          status: response.ok ? 'healthy' : 'unhealthy',
          latency: Date.now() - start
        }
      } catch {
        agentOSHealth = { status: 'unhealthy', latency: 0 }
      }
    }

    const [ssoCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ssoProvider)

    const [webhooksCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(webhookEndpoint)

    return NextResponse.json({
      health: {
        agentOS: agentOSHealth,
        database: { status: 'healthy' }
      },
      config: {
        agentOSUrl: agentOSUrl || 'Not configured',
        ssoProvidersCount: ssoCount?.count ?? 0,
        webhooksCount: webhooksCount?.count ?? 0
      },
      version: {
        app: process.env.npm_package_version || '1.0.0',
        node: process.version
      }
    })
  } catch (error) {
    console.error('Failed to fetch system info:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system info' },
      { status: 500 }
    )
  }
}
