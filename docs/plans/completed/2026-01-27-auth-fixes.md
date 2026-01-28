# Authentication Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three authentication issues: proxy.ts not being detected, email verification blocking admin login, and SSO providers not auto-seeding from environment variables.

**Architecture:** We'll first try moving proxy.ts to src/ directory (same level as app/). If that fails, we fall back to middleware.ts with nodejs runtime. For email verification, we'll use Better Auth's databaseHooks to set emailVerified during admin user creation. For SSO, we'll create an auto-seeding function that registers providers from environment variables on startup.

**Tech Stack:** Next.js 16.1.5, Better Auth 1.4.17, Drizzle ORM, PostgreSQL

---

## Phase 1: Fix Proxy Detection

### Task 1: Move proxy.ts to src/ Directory

**Files:**

- Delete: `middleware.ts` (current state from failed experiment)
- Move: `proxy.ts.bak` → `src/proxy.ts`
- Delete: `proxy.ts.bak`

**Step 1: Clean up current state and move proxy to src/**

```bash
rm middleware.ts
mv proxy.ts.bak src/proxy.ts
```

**Step 2: Update the proxy to use Better Auth recommended pattern**

Modify: `src/proxy.ts`

```typescript
import { getSessionCookie } from 'better-auth/cookies'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const publicRoutes = ['/login', '/api/auth']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Optimistic cookie check (fast, but not secure alone)
  // Full session validation happens in page/route handlers
  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)']
}
```

**Step 3: Build and verify proxy is detected**

```bash
rm -rf .next && pnpm build 2>&1 | tee /tmp/build.log
```

Expected: Build completes. Check for proxy compilation.

**Step 4: Check middleware manifest**

```bash
cat .next/server/middleware-manifest.json
```

Expected: `middleware` object should NOT be empty.

**Step 5: Commit if successful**

```bash
git add src/proxy.ts
git commit -m "fix: move proxy.ts to src/ for Turbopack detection"
```

---

### Task 2: Fallback to middleware.ts (If Task 1 Fails)

**Only execute this task if Task 1's manifest is still empty.**

**Files:**

- Rename: `src/proxy.ts` → `src/middleware.ts`
- Modify function name: `proxy` → `middleware`

**Step 1: Rename file and update function**

```bash
mv src/proxy.ts src/middleware.ts
```

**Step 2: Update the function name and add runtime config**

Modify: `src/middleware.ts`

```typescript
import { getSessionCookie } from 'better-auth/cookies'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const publicRoutes = ['/login', '/api/auth']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Optimistic cookie check (fast, but not secure alone)
  // Full session validation happens in page/route handlers
  const sessionCookie = getSessionCookie(request)

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)']
}
```

**Step 3: Clean build and verify**

```bash
rm -rf .next && pnpm build 2>&1
cat .next/server/middleware-manifest.json
```

Expected: `middleware` object should NOT be empty.

**Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "fix: use middleware.ts with nodejs runtime for auth protection"
```

---

## Phase 2: Fix Email Verification for Seeded Admin

### Task 3: Add databaseHooks to Set emailVerified for Admin

**Files:**

- Modify: `src/lib/auth.ts:16-115` (add databaseHooks)

**Step 1: Add databaseHooks configuration**

Add after line 23 (after the `schema` closing brace in database config):

```typescript
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Auto-verify email for seeded admin account
          const adminEmail = process.env.ADMIN_EMAIL
          if (adminEmail && user.email === adminEmail) {
            return {
              data: {
                ...user,
                emailVerified: true
              }
            }
          }
          return { data: user }
        }
      }
    }
  },
```

**Step 2: Verify the full auth.ts structure**

The updated `src/lib/auth.ts` should look like:

```typescript
import { betterAuth } from 'better-auth'
import { organization, admin } from 'better-auth/plugins'
import { nextCookies } from 'better-auth/next-js'
import { sso } from '@better-auth/sso'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { userProfileService } from '@/lib/user'

// Get base URL from environment, with fallback for development
const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3000'

export const auth = betterAuth({
  baseURL,
  trustedOrigins: [baseURL],

  database: drizzleAdapter(db, {
    provider: 'pg',
    schema
  }),

  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Auto-verify email for seeded admin account
          const adminEmail = process.env.ADMIN_EMAIL
          if (adminEmail && user.email === adminEmail) {
            return {
              data: {
                ...user,
                emailVerified: true
              }
            }
          }
          return { data: user }
        }
      }
    }
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV === 'production'
  },

  // ... rest of config unchanged
})
```

**Step 3: Update seedAdmin to remove redundant emailVerified update**

Modify: `src/lib/auth/seedAdmin.ts`

The databaseHook now handles emailVerified, but keep the role update:

```typescript
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import { logAdminEvent } from '@/lib/audit/logger'

let seeded = false

export async function seedAdminIfNeeded() {
  if (seeded) return

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    seeded = true
    return
  }

  const existing = await db.query.user.findFirst({
    where: eq(user.email, adminEmail)
  })

  if (existing) {
    seeded = true
    return
  }

  // Create user via Better Auth
  // databaseHooks.user.create.before sets emailVerified: true for admin
  const result = await auth.api.createUser({
    body: {
      email: adminEmail,
      password: adminPassword,
      name: 'System Administrator',
      role: 'user'
    }
  })

  // Promote to globalAdmin role (emailVerified handled by databaseHook)
  if (result?.user?.id) {
    await db
      .update(user)
      .set({ role: 'globalAdmin' })
      .where(eq(user.id, result.user.id))
  }

  await logAdminEvent(
    'admin.auto_seeded',
    {
      type: 'system',
      id: 'system',
      email: 'system@internal',
      orgId: 'system'
    },
    {
      type: 'user',
      id: result?.user?.id || '',
      name: adminEmail,
      orgId: 'system'
    },
    'success',
    {
      email: adminEmail,
      source: 'environment_variables',
      severity: 'critical'
    }
  )

  seeded = true
  console.log(`[Auth] Fail-safe admin seeded: ${adminEmail}`)
}
```

**Step 4: Run type check**

```bash
pnpm typecheck
```

Expected: No type errors.

**Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/auth/seedAdmin.ts
git commit -m "fix: use databaseHooks to set emailVerified for seeded admin"
```

---

## Phase 3: Fix SSO Provider Auto-Seeding

### Task 4: Create SSO Provider Seeding Function

**Files:**

- Create: `src/lib/auth/seedSSOProvider.ts`

**Step 1: Create the SSO seeding function**

```typescript
import { db } from '@/lib/db'
import { ssoProvider } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { eq } from 'drizzle-orm'

let seeded = false

export async function seedSSOProviderIfNeeded() {
  if (seeded) return

  const clientId = process.env.ENTRA_CLIENT_ID
  const clientSecret = process.env.ENTRA_CLIENT_SECRET
  const tenantId = process.env.ENTRA_TENANT_ID

  if (!clientId || !clientSecret || !tenantId) {
    seeded = true
    return
  }

  // Check if provider already exists
  const existing = await db.query.ssoProvider.findFirst({
    where: eq(ssoProvider.providerId, 'microsoft-entra')
  })

  if (existing) {
    seeded = true
    return
  }

  try {
    // Register the provider via Better Auth API
    await auth.api.registerSSOProvider({
      body: {
        providerId: 'microsoft-entra',
        issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
        domain: process.env.SSO_DOMAIN || 'localhost',
        oidcConfig: {
          clientId,
          clientSecret,
          discoveryEndpoint: `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`,
          scopes: ['openid', 'email', 'profile'],
          pkce: true,
          mapping: {
            id: 'sub',
            email: 'email',
            name: 'name',
            emailVerified: 'email_verified',
            image: 'picture'
          }
        }
      },
      headers: new Headers()
    })

    seeded = true
    console.log('[Auth] Microsoft Entra SSO provider seeded')
  } catch (error) {
    console.error('[Auth] Failed to seed SSO provider:', error)
    seeded = true // Don't retry on failure
  }
}
```

**Step 2: Run type check**

```bash
pnpm typecheck
```

Expected: No type errors.

**Step 3: Commit**

```bash
git add src/lib/auth/seedSSOProvider.ts
git commit -m "feat: add SSO provider auto-seeding from environment variables"
```

---

### Task 5: Wire Up SSO Seeding to Auth Route

**Files:**

- Modify: `src/app/api/auth/[...all]/route.ts`

**Step 1: Add SSO seeding call**

```typescript
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
import { seedAdminIfNeeded } from '@/lib/auth/seedAdmin'
import { seedSSOProviderIfNeeded } from '@/lib/auth/seedSSOProvider'

// Seed admin and SSO providers on first module load (runs once per server instance)
seedAdminIfNeeded().catch(console.error)
seedSSOProviderIfNeeded().catch(console.error)

export const { GET, POST } = toNextJsHandler(auth)
```

**Step 2: Run type check**

```bash
pnpm typecheck
```

Expected: No type errors.

**Step 3: Commit**

```bash
git add src/app/api/auth/[...all]/route.ts
git commit -m "feat: wire SSO provider seeding to auth route initialization"
```

---

### Task 6: Add SSO_DOMAIN to Environment Variables

**Files:**

- Modify: `.env.example` (add SSO_DOMAIN documentation)

**Step 1: Update .env.example**

Add after the ENTRA variables:

```bash
# SSO domain for provider matching (your organization's email domain)
# SSO_DOMAIN=yourcompany.com
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add SSO_DOMAIN to environment example"
```

---

## Phase 4: Integration Testing

### Task 7: Build and Test Full Stack

**Step 1: Run full validation**

```bash
pnpm validate
```

Expected: All checks pass.

**Step 2: Build for production**

```bash
pnpm build
```

Expected: Build completes successfully.

**Step 3: Verify middleware/proxy manifest**

```bash
cat .next/server/middleware-manifest.json
```

Expected: Non-empty middleware configuration.

**Step 4: Rebuild Docker image**

```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

**Step 5: Test authentication flow**

1. Navigate to http://localhost:3000
2. Verify redirect to /login for protected routes
3. Test admin login with ADMIN_EMAIL/ADMIN_PASSWORD
4. Verify SSO provider appears on login page (if ENTRA vars configured)

**Step 6: Final commit with all changes**

```bash
git status
# If any uncommitted changes:
git add .
git commit -m "chore: complete auth fixes implementation"
```

---

## Verification Checklist

- [ ] Protected routes redirect to /login when not authenticated
- [ ] Admin can log in without "Email not verified" error
- [ ] SSO providers appear on login page (when configured)
- [ ] Build completes without errors
- [ ] TypeScript type checks pass
- [ ] Docker deployment works correctly
