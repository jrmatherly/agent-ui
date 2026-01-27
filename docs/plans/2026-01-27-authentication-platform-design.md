# Authentication Platform Design

**Date:** 2026-01-27
**Status:** Draft
**Author:** Claude (via brainstorming session)

## Overview

Implement a fully-gated authentication system for Agent UI where all routes require authentication. Users authenticate primarily via SSO (organizational identity providers), with a fail-safe local admin account for emergencies.

## Requirements

1. **Fully Gated Access** - All routes require authentication except `/login` and `/api/auth/*`
2. **SSO-First** - Users authenticate through configured SSO providers (OIDC/SAML)
3. **Fail-safe Admin** - Environment-defined local admin account auto-seeded on startup
4. **Redirect Preservation** - Return users to original destination after login
5. **Feature-rich Dashboard** - Landing page with sessions, pinned agents, stats, activity feed
6. **Role-adaptive UI** - Admins see additional metrics tab on dashboard

## Architecture

### Authentication Flow

```mermaid


┌─────────────────────────────────────────────────────────────────┐
│                        User Access                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Proxy (proxy.ts)                      │
│  • Check session via auth.api.getSession()                       │
│  • Public routes: /login, /api/auth/*                           │
│  • All other routes → redirect to /login?redirect={originalUrl} │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────┐         ┌──────────────────────┐
│     /login Page      │         │   Protected Routes   │
│  ┌────────────────┐  │         │   /, /chat, /admin   │
│  │  SSO Buttons   │  │         └──────────────────────┘
│  │  (configured)  │  │
│  └────────────────┘  │
│  [Admin login link]  │
│         ↓            │
│  ┌────────────────┐  │
│  │ Email/Password │  │
│  │    (hidden)    │  │
│  └────────────────┘  │
└──────────────────────┘
```

### Route Structure

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/login` | SSO buttons + admin login link | No |
| `/` | Dashboard (home after login) | Yes |
| `/chat` | Chat interface | Yes |
| `/admin` | Admin dashboard | Yes + Role |
| `/api/auth/*` | Better Auth endpoints | No |

### SSO Login Flow

```mermaid
User clicks SSO button
        │
        ▼
authClient.signIn.sso({ providerId, callbackURL })
        │
        ▼
Better Auth redirects to IdP
        │
        ▼
User authenticates with IdP
        │
        ▼
IdP redirects to /api/auth/callback/sso
        │
        ▼
Better Auth SSO plugin:
  • Creates/finds user
  • Provisions organization membership
  • Maps groups to roles
  • Creates session
        │
        ▼
Redirect to callbackURL (original destination or /)
```

## Technical Specifications

### Environment Variables

```bash
# Fail-safe Admin Account (auto-created on first startup if not exists)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=              # Generate: openssl rand -base64 24
```

### Proxy Configuration (Next.js 16)

```typescript
// proxy.ts
import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

const publicRoutes = ['/login', '/api/auth']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
```

### Admin Auto-Seed Logic

```typescript
// src/lib/auth/seedAdmin.ts
import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { eq } from 'drizzle-orm'
import { logAuditEvent } from '@/lib/audit/logger'

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

  // Create admin using Better Auth admin plugin API
  await auth.api.createUser({
    body: {
      email: adminEmail,
      password: adminPassword,
      name: 'System Administrator',
      role: 'globalAdmin'
    }
  })

  await logAuditEvent({
    action: 'admin.auto_seeded',
    category: 'security',
    severity: 'critical',
    detail: { email: adminEmail, source: 'environment_variables' }
  })

  seeded = true
  console.log(`[Auth] Fail-safe admin seeded: ${adminEmail}`)
}
```

### Auth Configuration Update

```typescript
// src/lib/auth.ts - add nextCookies plugin
import { nextCookies } from 'better-auth/next-js'

export const auth = betterAuth({
  // ... existing config
  plugins: [
    organization({ ... }),
    admin({ ... }),
    sso({ ... }),
    nextCookies()  // Must be last plugin
  ]
})
```

### Login Page Components

```mermaid
src/app/login/page.tsx              # Server component
src/components/auth/
  ├── LoginPage.tsx                 # Client component - main UI
  ├── SSOButtons.tsx                # Dynamic SSO provider buttons
  └── AdminLoginForm.tsx            # Email/password form (hidden default)
```

**Login Page Layout:**

- Logo and title at top
- SSO buttons rendered dynamically from `/api/auth/sso/providers`
- Divider line
- Small "Admin login" text link
- Email/password form (hidden until link clicked)

### Dashboard Components

```mermaid
src/app/(main)/page.tsx              # Dashboard page
src/components/dashboard/
  ├── Dashboard.tsx                  # Container with tabs
  ├── RecentSessions.tsx             # Session list with resume
  ├── PinnedAgents.tsx               # Favorite agents grid
  ├── QuickActions.tsx               # New chat, upload, settings
  ├── TeamActivityFeed.tsx           # Team activity stream
  ├── UsageStats.tsx                 # Usage metrics widget
  └── AdminMetrics.tsx               # Admin-only tab content
```

**Dashboard Features:**

- Welcome message with user name
- "New Chat" primary action button
- Tabs: Overview | Admin (admin-only)
- Widgets: Usage stats, Quick actions, Pinned agents, Recent sessions
- Team activity feed at bottom

## File Changes

### New Files

| File | Purpose |
|------|---------|
| `proxy.ts` | Route protection |
| `src/app/login/page.tsx` | Login page |
| `src/components/auth/LoginPage.tsx` | Login UI |
| `src/components/auth/SSOButtons.tsx` | SSO buttons |
| `src/components/auth/AdminLoginForm.tsx` | Admin form |
| `src/app/(main)/layout.tsx` | Protected layout |
| `src/app/(main)/page.tsx` | Dashboard |
| `src/app/(main)/chat/page.tsx` | Chat (moved) |
| `src/components/dashboard/*.tsx` | Dashboard widgets |
| `src/lib/auth/seedAdmin.ts` | Admin seed logic |
| `src/app/api/auth/sso/providers/route.ts` | Public SSO list |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/auth.ts` | Add `nextCookies()` plugin |
| `src/lib/sso/providerService.ts` | Add `getEnabledProviders()` |
| `src/app/api/auth/[...all]/route.ts` | Trigger admin seed |
| `docs/ENVIRONMENT.md` | Add admin variables |
| `.env.example` | Add admin variables |
| `.env` | Add admin variables |
| `e2e/fixtures/auth.ts` | Update login flow |
| `e2e/auth/*.spec.ts` | Update test selectors |

### Files to Move

| From | To |
|------|-----|
| `src/app/page.tsx` | `src/app/(main)/chat/page.tsx` |

## Testing

E2E tests will pass after implementation:

- Login page renders SSO buttons
- Admin login form appears on link click
- Valid credentials redirect to dashboard
- Invalid credentials show error
- Unauthenticated users redirect to login
- Redirect param preserved through login flow

## Security Considerations

1. **Admin Password Strength** - Document minimum requirements in ENVIRONMENT.md
2. **Audit Logging** - All admin seeds logged as critical security events
3. **SSO Provider Validation** - Only enabled providers shown on login page
4. **Session Validation** - Full database validation in proxy, not just cookie check
5. **ADMIN_DISABLED Option** - Consider adding to skip seed entirely in some environments

## References

- [Better Auth Documentation](https://better-auth.com)
- [Better Auth SSO Plugin](https://www.better-auth.com/docs/plugins/sso)
- [Better Auth Admin Plugin](https://www.better-auth.com/docs/plugins/admin)
- [Better Auth Next.js Integration](https://www.better-auth.com/docs/integrations/next)
