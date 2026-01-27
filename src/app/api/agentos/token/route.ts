import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { isJWTSigningEnabled, signAgentOSToken } from '@/lib/agentos/jwt'
import type { Role } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  // Check if JWT signing is configured
  if (!isJWTSigningEnabled()) {
    return NextResponse.json(
      { error: 'AgentOS JWT authentication is not configured' },
      { status: 503 }
    )
  }

  // Validate Better Auth session
  const session = await auth.api.getSession({
    headers: request.headers
  })

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized - no valid session' },
      { status: 401 }
    )
  }

  try {
    // Get user role (default to 'user' if not set)
    const role = (session.user.role as Role) || 'user'

    const result = await signAgentOSToken({
      userId: session.user.id,
      role,
      sessionId: session.session.id
    })

    return NextResponse.json({
      token: result.token,
      expiresAt: result.expiresAt
    })
  } catch (error) {
    console.error('Failed to sign AgentOS token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
