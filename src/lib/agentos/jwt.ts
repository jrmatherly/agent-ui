import { SignJWT } from 'jose'

import { getAgnoScopes } from './scopes'

import type { Role } from '@/lib/permissions'

// JWT configuration
const JWT_ALGORITHM = 'RS256'
const JWT_AUDIENCE = 'AgentOS'
const JWT_EXPIRES_IN_SECONDS = parseInt(
  process.env.AGENTOS_JWT_EXPIRES_IN || '900',
  10
) // 15 minutes default

// Cache the private key
let cachedPrivateKey: CryptoKey | null = null

async function getPrivateKey(): Promise<CryptoKey> {
  if (cachedPrivateKey) return cachedPrivateKey

  const privateKeyPem = process.env.AGENTOS_JWT_PRIVATE_KEY
  if (!privateKeyPem) {
    throw new Error('AGENTOS_JWT_PRIVATE_KEY environment variable is not set')
  }

  // Handle escaped newlines from environment variable
  const normalizedPem = privateKeyPem.replace(/\\n/g, '\n')

  // Import the PEM key
  const pemContents = normalizedPem
    .replace('-----BEGIN RSA PRIVATE KEY-----', '')
    .replace('-----END RSA PRIVATE KEY-----', '')
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  cachedPrivateKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  return cachedPrivateKey
}

export interface AgentOSTokenPayload {
  sub: string // User ID
  scopes: string[]
  aud: string
  exp: number
  iat: number
}

export interface SignTokenOptions {
  userId: string
  role: Role
  sessionId?: string
}

export interface SignTokenResult {
  token: string
  expiresAt: number // Unix timestamp in milliseconds
}

/**
 * Signs a JWT for AgentOS API authentication.
 * This function must only be called server-side.
 */
export async function signAgentOSToken(
  options: SignTokenOptions
): Promise<SignTokenResult> {
  const { userId, role, sessionId } = options

  const privateKey = await getPrivateKey()
  const now = Math.floor(Date.now() / 1000)
  const exp = now + JWT_EXPIRES_IN_SECONDS

  const scopes = getAgnoScopes(role)

  const jwt = new SignJWT({
    scopes,
    ...(sessionId && { session_id: sessionId })
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setSubject(userId)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(exp)

  const token = await jwt.sign(privateKey)

  return {
    token,
    expiresAt: exp * 1000 // Convert to milliseconds
  }
}

/**
 * Check if JWT signing is configured.
 */
export function isJWTSigningEnabled(): boolean {
  return !!process.env.AGENTOS_JWT_PRIVATE_KEY
}
