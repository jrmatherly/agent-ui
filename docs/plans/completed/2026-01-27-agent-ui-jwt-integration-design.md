# Agent-UI JWT Integration Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement JWT-based authentication for AgentOS API calls, replacing the deprecated `NEXT_PUBLIC_OS_SECURITY_KEY` approach with RS256 signed tokens that include Agno-compatible RBAC scopes.

**Architecture:** Agent-UI issues JWTs server-side via a dedicated API endpoint. The client stores tokens in memory (not localStorage) and auto-refreshes before expiry. All AgentOS API calls include the JWT in the Authorization header.

**Tech Stack:** jose (JWT library), Better Auth (session validation), Zustand (token state), Next.js API routes

---

## Prerequisites

Before starting this implementation:

1. **AgentOS backend** must have JWT RBAC enabled (see `agentos-docker/docs/plans/2026-01-27-jwt-rbac-integration-design.md`)
2. **RSA key pair** must be generated and shared:
   - Private key → agent-ui (`AGENTOS_JWT_PRIVATE_KEY`)
   - Public key → agentos-docker (`JWT_VERIFICATION_KEY`)
3. **Better Auth** must be configured and working

---

## Phase 1: JWT Infrastructure

### Task 1: Add JWT Dependencies

**Step 1: Install jose library**

```bash
pnpm add jose
```

**Step 2: Verify installation**

```bash
pnpm list jose
```

Expected: `jose@5.x.x` or later

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: add jose library for JWT signing"
```

---

### Task 2: Create Agno Scope Mapping

**Files:**

- Create: `src/lib/agentos/scopes.ts`

**Step 1: Create the scope mapping module**

Create file `src/lib/agentos/scopes.ts`:

```typescript
import type { Role } from '@/lib/permissions'

/**
 * Maps agent-ui roles to Agno RBAC scopes.
 *
 * Scope format: resource:action or resource:<id>:action
 * See: https://docs.agno.com/agent-os/security/rbac
 */

const BASE_USER_SCOPES = [
  'agents:read',
  'agents:run',
  'sessions:read',
  'sessions:write'
] as const

const POWER_USER_SCOPES = [...BASE_USER_SCOPES, 'system:read'] as const

const TEAM_LEAD_SCOPES = [
  ...POWER_USER_SCOPES,
  'teams:read',
  'teams:run',
  'memories:read'
] as const

const TEAM_ADMIN_SCOPES = [
  ...TEAM_LEAD_SCOPES,
  'agents:write',
  'sessions:delete',
  'workflows:read',
  'workflows:run'
] as const

const ORG_ADMIN_SCOPES = [
  ...TEAM_ADMIN_SCOPES,
  'knowledge:read',
  'knowledge:write',
  'knowledge:delete',
  'memories:write',
  'memories:delete',
  'metrics:read',
  'evals:read',
  'traces:read'
] as const

const GLOBAL_ADMIN_SCOPES = ['agent_os:admin'] as const

export const ROLE_TO_AGNO_SCOPES: Record<Role, readonly string[]> = {
  user: BASE_USER_SCOPES,
  powerUser: POWER_USER_SCOPES,
  teamLead: TEAM_LEAD_SCOPES,
  teamAdmin: TEAM_ADMIN_SCOPES,
  orgAdmin: ORG_ADMIN_SCOPES,
  globalAdmin: GLOBAL_ADMIN_SCOPES
}

export function getAgnoScopes(role: Role): string[] {
  return [...(ROLE_TO_AGNO_SCOPES[role] || ROLE_TO_AGNO_SCOPES.user)]
}
```

**Step 2: Verify syntax**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add src/lib/agentos/scopes.ts
git commit -m "feat(agentos): add role-to-scope mapping for Agno RBAC"
```

---

### Task 3: Create JWT Signing Service

**Files:**

- Create: `src/lib/agentos/jwt.ts`

**Step 1: Create the JWT signing module**

Create file `src/lib/agentos/jwt.ts`:

```typescript
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
    throw new Error(
      'AGENTOS_JWT_PRIVATE_KEY environment variable is not set'
    )
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
```

**Step 2: Verify syntax**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add src/lib/agentos/jwt.ts
git commit -m "feat(agentos): add JWT signing service with RS256"
```

---

### Task 4: Create Token Endpoint

**Files:**

- Create: `src/app/api/agentos/token/route.ts`

**Step 1: Create the API route**

Create file `src/app/api/agentos/token/route.ts`:

```typescript
import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { isJWTSigningEnabled, signAgentOSToken } from '@/lib/agentos/jwt'
import type { Role } from '@/lib/permissions'

export async function POST() {
  // Check if JWT signing is configured
  if (!isJWTSigningEnabled()) {
    return NextResponse.json(
      { error: 'AgentOS JWT authentication is not configured' },
      { status: 503 }
    )
  }

  // Validate Better Auth session
  const session = await auth.api.getSession({
    headers: new Headers()
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
```

**Step 2: Verify syntax**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add src/app/api/agentos/token/route.ts
git commit -m "feat(agentos): add token endpoint for JWT issuance"
```

---

## Phase 2: Client Integration

### Task 5: Create AgentOS Token Store

**Files:**

- Create: `src/lib/agentos/tokenStore.ts`

**Step 1: Create the token store**

Create file `src/lib/agentos/tokenStore.ts`:

```typescript
/**
 * In-memory token store for AgentOS JWT.
 *
 * Tokens are stored in memory only (not localStorage/sessionStorage)
 * for security. This means tokens are cleared on page refresh,
 * but auto-refresh handles seamless re-authentication.
 */

interface TokenState {
  token: string | null
  expiresAt: number | null
  isFetching: boolean
  fetchPromise: Promise<string | null> | null
}

const state: TokenState = {
  token: null,
  expiresAt: null,
  isFetching: false,
  fetchPromise: null
}

// Refresh token when less than 5 minutes remaining
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000

async function fetchToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/agentos/token', {
      method: 'POST',
      credentials: 'include'
    })

    if (!response.ok) {
      if (response.status === 401) {
        // User not authenticated - this is expected for logged-out users
        return null
      }
      throw new Error(`Token fetch failed: ${response.status}`)
    }

    const data = await response.json()
    state.token = data.token
    state.expiresAt = data.expiresAt
    return data.token
  } catch (error) {
    console.error('Failed to fetch AgentOS token:', error)
    return null
  }
}

/**
 * Get a valid AgentOS token, fetching or refreshing as needed.
 * Returns null if user is not authenticated.
 */
export async function getValidToken(): Promise<string | null> {
  const now = Date.now()

  // If we have a valid token with enough time remaining, return it
  if (
    state.token &&
    state.expiresAt &&
    state.expiresAt - now > REFRESH_THRESHOLD_MS
  ) {
    return state.token
  }

  // If already fetching, wait for that request
  if (state.isFetching && state.fetchPromise) {
    return state.fetchPromise
  }

  // Fetch a new token
  state.isFetching = true
  state.fetchPromise = fetchToken().finally(() => {
    state.isFetching = false
    state.fetchPromise = null
  })

  return state.fetchPromise
}

/**
 * Clear the cached token (call on logout).
 */
export function clearToken(): void {
  state.token = null
  state.expiresAt = null
}

/**
 * Check if a token is currently cached.
 */
export function hasToken(): boolean {
  return state.token !== null
}
```

**Step 2: Verify syntax**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add src/lib/agentos/tokenStore.ts
git commit -m "feat(agentos): add in-memory token store with auto-refresh"
```

---

### Task 6: Create AgentOS API Client

**Files:**

- Create: `src/lib/agentos/client.ts`

**Step 1: Create the API client**

Create file `src/lib/agentos/client.ts`:

```typescript
import { clearToken, getValidToken } from './tokenStore'

export interface AgentOSRequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
}

export class AgentOSClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string,
    public response?: unknown
  ) {
    super(message)
    this.name = 'AgentOSClientError'
  }

  /**
   * Check if this is an authentication error (invalid/expired token).
   * Error messages per AgentOS alignment doc.
   */
  isAuthError(): boolean {
    return this.status === 401
  }

  /**
   * Check if this is a permission error (insufficient scopes).
   */
  isPermissionError(): boolean {
    return this.status === 403 && this.detail === 'Insufficient permissions'
  }

  /**
   * Check if the token has expired.
   */
  isTokenExpired(): boolean {
    return this.status === 401 && this.detail === 'Token has expired'
  }
}

/**
 * Make an authenticated request to AgentOS.
 * Automatically handles JWT token management.
 */
export async function agentosRequest<T = unknown>(
  endpoint: string,
  baseUrl: string,
  options: AgentOSRequestOptions = {}
): Promise<T> {
  const token = await getValidToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers
  })

  // Handle 401 - token may be invalid, clear and retry once
  if (response.status === 401 && token) {
    clearToken()
    const newToken = await getValidToken()

    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      const retryResponse = await fetch(url, {
        ...options,
        headers
      })

      if (!retryResponse.ok) {
        const errorBody = await retryResponse.json().catch(() => ({}))
        throw new AgentOSClientError(
          `AgentOS request failed: ${retryResponse.statusText}`,
          retryResponse.status,
          errorBody?.detail,
          errorBody
        )
      }

      return retryResponse.json()
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new AgentOSClientError(
      `AgentOS request failed: ${response.statusText}`,
      response.status,
      errorBody?.detail,
      errorBody
    )
  }

  return response.json()
}

/**
 * Create an AgentOS client bound to a specific base URL.
 */
export function createAgentOSClient(baseUrl: string) {
  return {
    get: <T = unknown>(endpoint: string, options?: AgentOSRequestOptions) =>
      agentosRequest<T>(endpoint, baseUrl, { ...options, method: 'GET' }),

    post: <T = unknown>(
      endpoint: string,
      body?: unknown,
      options?: AgentOSRequestOptions
    ) =>
      agentosRequest<T>(endpoint, baseUrl, {
        ...options,
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined
      }),

    patch: <T = unknown>(
      endpoint: string,
      body?: unknown,
      options?: AgentOSRequestOptions
    ) =>
      agentosRequest<T>(endpoint, baseUrl, {
        ...options,
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined
      }),

    delete: <T = unknown>(endpoint: string, options?: AgentOSRequestOptions) =>
      agentosRequest<T>(endpoint, baseUrl, { ...options, method: 'DELETE' })
  }
}
```

**Step 2: Verify syntax**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add src/lib/agentos/client.ts
git commit -m "feat(agentos): add authenticated API client with auto-retry"
```

---

### Task 7: Create Index Export

**Files:**

- Create: `src/lib/agentos/index.ts`

**Step 1: Create the index file**

Create file `src/lib/agentos/index.ts`:

```typescript
// Client-side exports
export { createAgentOSClient, agentosRequest, AgentOSClientError } from './client'
export { getValidToken, clearToken, hasToken } from './tokenStore'
export { getAgnoScopes, ROLE_TO_AGNO_SCOPES } from './scopes'

// Server-side exports (jwt.ts should only be imported in API routes)
// import { signAgentOSToken, isJWTSigningEnabled } from '@/lib/agentos/jwt'
```

**Step 2: Commit**

```bash
git add src/lib/agentos/index.ts
git commit -m "feat(agentos): add module index exports"
```

---

### Task 8: Update API Layer

**Files:**

- Modify: `src/api/os.ts`

**Step 1: Refactor to use new client**

Replace the contents of `src/api/os.ts` with:

```typescript
import { toast } from 'sonner'

import { APIRoutes } from './routes'

import { createAgentOSClient, AgentOSClientError } from '@/lib/agentos'
import { AgentDetails, Sessions, TeamDetails } from '@/types/os'

export const getAgentsAPI = async (
  endpoint: string
): Promise<AgentDetails[]> => {
  const client = createAgentOSClient(endpoint)
  try {
    return await client.get<AgentDetails[]>('/agents')
  } catch (error) {
    if (error instanceof AgentOSClientError) {
      toast.error(`Failed to fetch agents: ${error.message}`)
    } else {
      toast.error('Error fetching agents')
    }
    return []
  }
}

export const getStatusAPI = async (base: string): Promise<number> => {
  try {
    const response = await fetch(APIRoutes.Status(base), {
      method: 'GET'
    })
    return response.status
  } catch {
    return 0
  }
}

export const getAllSessionsAPI = async (
  base: string,
  type: 'agent' | 'team',
  componentId: string,
  dbId: string
): Promise<Sessions | { data: [] }> => {
  const client = createAgentOSClient(base)
  try {
    const params = new URLSearchParams({
      type,
      component_id: componentId,
      db_id: dbId
    })
    return await client.get<Sessions>(`/sessions?${params.toString()}`)
  } catch (error) {
    if (error instanceof AgentOSClientError && error.status === 404) {
      return { data: [] }
    }
    return { data: [] }
  }
}

export const getSessionAPI = async (
  base: string,
  type: 'agent' | 'team',
  sessionId: string,
  dbId?: string
) => {
  const client = createAgentOSClient(base)
  const params = new URLSearchParams({ type })
  if (dbId) params.append('db_id', dbId)

  return client.get(`/sessions/${sessionId}?${params.toString()}`)
}

export const deleteSessionAPI = async (
  base: string,
  dbId: string,
  sessionId: string
) => {
  const client = createAgentOSClient(base)
  const params = new URLSearchParams()
  if (dbId) params.append('db_id', dbId)

  return client.delete(`/sessions/${sessionId}?${params.toString()}`)
}

export const getTeamsAPI = async (endpoint: string): Promise<TeamDetails[]> => {
  const client = createAgentOSClient(endpoint)
  try {
    return await client.get<TeamDetails[]>('/teams')
  } catch (error) {
    if (error instanceof AgentOSClientError) {
      toast.error(`Failed to fetch teams: ${error.message}`)
    } else {
      toast.error('Error fetching teams')
    }
    return []
  }
}

export const deleteTeamSessionAPI = async (
  base: string,
  teamId: string,
  sessionId: string
) => {
  const client = createAgentOSClient(base)
  return client.delete(`/teams/${teamId}/sessions/${sessionId}`)
}
```

**Step 2: Verify syntax and update any callers**

```bash
pnpm typecheck
```

Fix any type errors from removed `authToken` parameters.

**Step 3: Commit**

```bash
git add src/api/os.ts
git commit -m "refactor(api): use AgentOS client with automatic JWT auth"
```

---

## Phase 3: Environment & Cleanup

### Task 9: Update Environment Configuration

**Files:**

- Modify: `.env.example`

**Step 1: Update the example file**

Replace the AgentOS section with:

```bash
# -----------------------------------------------------------------------------
# AgentOS Backend
# -----------------------------------------------------------------------------

# Required: AgentOS backend URL
NEXT_PUBLIC_AGENT_OS_URL=http://localhost:7777

# -----------------------------------------------------------------------------
# AgentOS JWT Authentication (RS256)
# -----------------------------------------------------------------------------

# Required for production: Private key for signing JWTs
# Generate with: openssl genrsa -out private.pem 2048
# The corresponding public key goes to AgentOS as JWT_VERIFICATION_KEY
# Note: Use literal \n for newlines or use a single line
AGENTOS_JWT_PRIVATE_KEY=

# Optional: JWT expiration in seconds (default: 900 = 15 minutes)
AGENTOS_JWT_EXPIRES_IN=900
```

**Step 2: Remove deprecated variable**

Remove these lines from `.env.example`:

```bash
# Optional: Security key for authenticated AgentOS endpoints
# Obtain from your AgentOS instance configuration
NEXT_PUBLIC_OS_SECURITY_KEY=
```

**Step 3: Commit**

```bash
git add .env.example
git commit -m "chore(env): replace OS_SECURITY_KEY with JWT auth config"
```

---

### Task 10: Update mise.toml

**Files:**

- Modify: `mise.toml`

**Step 1: Remove deprecated comment**

Remove the line referencing `NEXT_PUBLIC_OS_SECURITY_KEY`.

**Step 2: Commit**

```bash
git add mise.toml
git commit -m "chore(mise): remove deprecated OS_SECURITY_KEY reference"
```

---

### Task 11: Update Chat Page

**Files:**

- Modify: `src/app/(main)/chat/page.tsx`

**Step 1: Remove env token logic**

Remove these lines:

```typescript
// Check if OS_SECURITY_KEY is defined on server-side
const hasEnvToken = !!process.env.NEXT_PUBLIC_OS_SECURITY_KEY
const envToken = process.env.NEXT_PUBLIC_OS_SECURITY_KEY || ''
```

And remove passing these as props to child components.

**Step 2: Update component props**

Remove `hasEnvToken` and `envToken` props from `<ChatLayoutClient>` or similar.

**Step 3: Commit**

```bash
git add src/app/(main)/chat/page.tsx
git commit -m "refactor(chat): remove deprecated env token props"
```

---

### Task 12: Update Logout Handler

**Files:**

- Modify: Logout component/handler (location varies)

**Step 1: Clear AgentOS token on logout**

Add to logout handler:

```typescript
import { clearToken } from '@/lib/agentos'

// In logout function:
clearToken()
```

**Step 2: Commit**

```bash
git add <logout-file>
git commit -m "feat(auth): clear AgentOS token on logout"
```

---

### Task 13: Update Documentation

**Files:**

- Modify: `docs/ENVIRONMENT.md`
- Modify: `docs/ARCHITECTURE.md`
- Create: `docs/AGENTOS_AUTH.md`

**Step 1: Update ENVIRONMENT.md**

Replace `NEXT_PUBLIC_OS_SECURITY_KEY` documentation with new JWT variables.

**Step 2: Update ARCHITECTURE.md**

Update the authentication section to describe JWT flow.

**Step 3: Create AGENTOS_AUTH.md**

Create comprehensive authentication guide covering:

- JWT authentication flow
- Key generation instructions
- Environment setup
- Role-to-scope mapping reference
- Troubleshooting 401/403 errors

**Step 4: Commit**

```bash
git add docs/
git commit -m "docs: update authentication documentation for JWT"
```

---

## Phase 4: Testing & Validation

### Task 14: Add Unit Tests

**Files:**

- Create: `src/__tests__/lib/agentos/scopes.test.ts`
- Create: `src/__tests__/lib/agentos/tokenStore.test.ts`

**Step 1: Create scope mapping tests**

Test all 6 roles return expected scopes.

**Step 2: Create token store tests**

Test caching, expiry detection, and clear functionality.

**Step 3: Commit**

```bash
git add src/__tests__/lib/agentos/
git commit -m "test(agentos): add unit tests for scopes and token store"
```

---

### Task 15: Integration Testing

**Step 1: Generate and configure keys**

```bash
# Generate RSA key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# View keys for copying
cat private.pem  # → AGENTOS_JWT_PRIVATE_KEY in agent-ui
cat public.pem   # → JWT_VERIFICATION_KEY in agentos-docker
```

**Step 2: Manual verification checklist**

Setup:

- [ ] Configure `AGENTOS_JWT_PRIVATE_KEY` in `.env.local` (with `\n` for newlines)
- [ ] Configure `JWT_VERIFICATION_KEY` in AgentOS `mise.local.toml`
- [ ] Start AgentOS: `docker compose up -d`
- [ ] Start agent-ui: `mise dev`

Authentication flow:

- [ ] Login via Better Auth (email/password or SSO)
- [ ] Open browser dev tools → Network tab
- [ ] Trigger API call (navigate to chat page)
- [ ] Verify `Authorization: Bearer <jwt>` header present
- [ ] Decode JWT at jwt.io → verify `scopes` array matches user role

API access:

- [ ] `agents:read` → GET /agents succeeds (200)
- [ ] `agents:run` → POST /agents/{id}/runs succeeds (200)
- [ ] `sessions:write` → session creation works

Error handling:

- [ ] Test expired token → 401 with `{"detail": "Token has expired"}`
- [ ] Test missing scope → 403 with `{"detail": "Insufficient permissions"}`
- [ ] Test invalid signature → 401 with `{"detail": "Invalid token: ..."}`

Token lifecycle:

- [ ] Wait 10+ minutes → verify auto-refresh triggers before expiry
- [ ] Logout → verify cached token cleared
- [ ] Login again → verify fresh token issued

---

### Task 16: Run Full Validation

**Step 1: Run all checks**

```bash
mise validate      # Lint + format + typecheck
mise test          # Unit tests
mise build         # Production build
```

**Step 2: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: formatting and validation fixes"
```

---

## Summary

**Alignment Status:** ✅ All integration concerns verified by AgentOS team (see `agentos-docker/docs/plans/2026-01-27-agent-ui-jwt-alignment.md`)

| Phase | Tasks | Key Deliverables |
|-------|-------|------------------|
| 1 | Tasks 1-4 | JWT infrastructure (jose, scopes, signing, endpoint) |
| 2 | Tasks 5-8 | Client integration (token store, API client, refactor) |
| 3 | Tasks 9-13 | Environment config, cleanup, documentation |
| 4 | Tasks 14-16 | Testing and validation |

**Files Created:**

- `src/lib/agentos/scopes.ts` - Role-to-scope mapping
- `src/lib/agentos/jwt.ts` - JWT signing service
- `src/lib/agentos/tokenStore.ts` - In-memory token store
- `src/lib/agentos/client.ts` - API client with auth
- `src/lib/agentos/index.ts` - Module exports
- `src/app/api/agentos/token/route.ts` - Token endpoint
- `docs/AGENTOS_AUTH.md` - Authentication guide

**Files Modified:**

- `src/api/os.ts` - Use new client
- `src/app/(main)/chat/page.tsx` - Remove env token
- `.env.example` - New JWT config
- `mise.toml` - Remove deprecated ref
- `docs/ENVIRONMENT.md` - Update docs
- `docs/ARCHITECTURE.md` - Update docs

**Environment Variables:**

| Variable | Purpose |
|----------|---------|
| `AGENTOS_JWT_PRIVATE_KEY` | RSA private key for signing |
| `AGENTOS_JWT_EXPIRES_IN` | Token expiration (default: 900s) |

**Removed:**

- `NEXT_PUBLIC_OS_SECURITY_KEY` - Deprecated

---

## AgentOS Integration Contract

All integration concerns have been verified by the AgentOS team. See the alignment document for full details:

**Reference:** `agentos-docker/docs/plans/2026-01-27-agent-ui-jwt-alignment.md`

### Verified Contract Summary

| Aspect | Verified Value |
|--------|----------------|
| Import path | `from agno.os.config import AuthorizationConfig` ✓ |
| Env precedence | `JWT_JWKS_FILE` first, then `JWT_VERIFICATION_KEY` ✓ |
| Audience claim | `aud: "AgentOS"` (optional, disabled by default) ✓ |
| User ID claim | `sub` → `request.state.user_id` ✓ |
| Scopes format | Array `["scope1", "scope2"]` (strings auto-converted) ✓ |
| Token source | Header-only (`Authorization: Bearer <token>`) ✓ |

### Error Response Format

AgentOS returns JSON with `detail` field:

| Status | Condition | `detail` Value |
|--------|-----------|----------------|
| 401 | Missing token | `"Authorization header missing"` |
| 401 | Expired token | `"Token has expired"` |
| 401 | Invalid signature | `"Invalid token: {error_message}"` |
| 401 | Wrong audience | `"Invalid token audience - token not valid for this AgentOS instance"` |
| 403 | Insufficient scopes | `"Insufficient permissions"` |

### Role-to-Scope Mapping (Verified)

| Role | Scopes |
|------|--------|
| `user` | `agents:read`, `agents:run`, `sessions:read`, `sessions:write` |
| `powerUser` | Above + `system:read` |
| `teamLead` | Above + `teams:read`, `teams:run`, `memories:read` |
| `teamAdmin` | Above + `agents:write`, `sessions:delete`, `workflows:read`, `workflows:run` |
| `orgAdmin` | Above + `knowledge:*`, `memories:write`, `memories:delete`, `metrics:read`, `evals:read`, `traces:read` |
| `globalAdmin` | `agent_os:admin` |
