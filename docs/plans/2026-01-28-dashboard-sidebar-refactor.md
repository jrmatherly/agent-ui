# Dashboard & Global Sidebar Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the Dashboard Overview page to display universal content for all authenticated users, integrate a global sidebar across all authenticated pages, and implement dynamic role-based tab rendering.

**Architecture:** Lift the existing Sidebar component to the `(main)` layout so it appears on all authenticated pages. Create a context-aware sidebar that shows full chat controls only on `/chat` and simplified navigation elsewhere. Move StatusBadge below the user profile in the sidebar. Implement a configuration-driven tab system using the existing permissions infrastructure.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Zustand, Tailwind CSS v4, Better Auth

---

## Summary of Changes

| Component | Change |
|-----------|--------|
| `src/app/(main)/layout.tsx` | Add global Sidebar wrapper |
| `src/components/chat/Sidebar/Sidebar.tsx` | Make context-aware, add StatusBadge |
| `src/components/chat/Sidebar/SidebarUserProfile.tsx` | Add StatusBadge below user dropdown |
| `src/components/dashboard/Dashboard.tsx` | Remove UsageStats, HeaderActions, implement dynamic tabs |
| `src/components/dashboard/tabConfig.ts` | NEW: Role-based tab configuration |
| `src/app/(main)/chat/page.tsx` | Remove Sidebar (now in layout) |
| `src/components/dashboard/UsageStats.tsx` | KEEP (may be used in Admin/Analytics) |

---

## Task 1: Create Tab Configuration Module

**Files:**

- Create: `src/components/dashboard/tabConfig.ts`
- Test: `src/components/dashboard/__tests__/tabConfig.test.ts`

**Step 1: Write the failing test**

Create test file:

```typescript
// src/components/dashboard/__tests__/tabConfig.test.ts
import { describe, it, expect } from 'vitest'
import { DASHBOARD_TABS, getVisibleTabs, type TabConfig } from '../tabConfig'

describe('tabConfig', () => {
  describe('DASHBOARD_TABS', () => {
    it('should have overview tab without role requirement', () => {
      const overview = DASHBOARD_TABS.find((t) => t.id === 'overview')
      expect(overview).toBeDefined()
      expect(overview?.minRole).toBeUndefined()
    })

    it('should have team tab requiring teamLead', () => {
      const team = DASHBOARD_TABS.find((t) => t.id === 'team')
      expect(team).toBeDefined()
      expect(team?.minRole).toBe('teamLead')
    })

    it('should have analytics tab requiring teamAdmin', () => {
      const analytics = DASHBOARD_TABS.find((t) => t.id === 'analytics')
      expect(analytics).toBeDefined()
      expect(analytics?.minRole).toBe('teamAdmin')
    })

    it('should have admin tab requiring orgAdmin', () => {
      const admin = DASHBOARD_TABS.find((t) => t.id === 'admin')
      expect(admin).toBeDefined()
      expect(admin?.minRole).toBe('orgAdmin')
    })
  })

  describe('getVisibleTabs', () => {
    it('should return only overview for user role', () => {
      const tabs = getVisibleTabs('user')
      expect(tabs.map((t) => t.id)).toEqual(['overview'])
    })

    it('should return overview for powerUser role', () => {
      const tabs = getVisibleTabs('powerUser')
      expect(tabs.map((t) => t.id)).toEqual(['overview'])
    })

    it('should return overview + team for teamLead role', () => {
      const tabs = getVisibleTabs('teamLead')
      expect(tabs.map((t) => t.id)).toEqual(['overview', 'team'])
    })

    it('should return overview + team + analytics for teamAdmin role', () => {
      const tabs = getVisibleTabs('teamAdmin')
      expect(tabs.map((t) => t.id)).toEqual(['overview', 'team', 'analytics'])
    })

    it('should return all tabs for orgAdmin role', () => {
      const tabs = getVisibleTabs('orgAdmin')
      expect(tabs.map((t) => t.id)).toEqual([
        'overview',
        'team',
        'analytics',
        'admin'
      ])
    })

    it('should return all tabs for globalAdmin role', () => {
      const tabs = getVisibleTabs('globalAdmin')
      expect(tabs.map((t) => t.id)).toEqual([
        'overview',
        'team',
        'analytics',
        'admin'
      ])
    })

    it('should return only overview for undefined role', () => {
      const tabs = getVisibleTabs(undefined)
      expect(tabs.map((t) => t.id)).toEqual(['overview'])
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/dashboard/__tests__/tabConfig.test.ts`
Expected: FAIL with "Cannot find module '../tabConfig'"

**Step 3: Write minimal implementation**

Create the tab configuration:

```typescript
// src/components/dashboard/tabConfig.ts
import { Role, hasRole } from '@/lib/permissions'

export interface TabConfig {
  id: string
  label: string
  minRole?: Role
}

export const DASHBOARD_TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'team', label: 'Team', minRole: 'teamLead' },
  { id: 'analytics', label: 'Analytics', minRole: 'teamAdmin' },
  { id: 'admin', label: 'Admin', minRole: 'orgAdmin' }
]

export function getVisibleTabs(userRole: Role | undefined): TabConfig[] {
  return DASHBOARD_TABS.filter((tab) => {
    if (!tab.minRole) return true
    if (!userRole) return false
    return hasRole(userRole, tab.minRole)
  })
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/components/dashboard/__tests__/tabConfig.test.ts`
Expected: PASS (all 9 tests)

**Step 5: Commit**

```bash
git add src/components/dashboard/tabConfig.ts src/components/dashboard/__tests__/tabConfig.test.ts
git commit -m "feat(dashboard): add role-based tab configuration module"
```

---

## Task 2: Create ConnectionStatus Component

Extract connection status logic from UsageStats into a reusable component for the sidebar.

**Files:**

- Create: `src/components/ui/connection-status.tsx`
- Test: `src/components/ui/__tests__/connection-status.test.tsx`

**Step 1: Write the failing test**

```typescript
// src/components/ui/__tests__/connection-status.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ConnectionStatus } from '../connection-status'

// Mock the store
vi.mock('@/store', () => ({
  useStore: vi.fn()
}))

import { useStore } from '@/store'

describe('ConnectionStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render connected status when agents exist and not loading', () => {
    vi.mocked(useStore).mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        agents: [{ id: '1', name: 'Agent 1' }],
        isEndpointLoading: false
      }
      return selector(state)
    })

    render(<ConnectionStatus />)
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })

  it('should render connecting status when loading', () => {
    vi.mocked(useStore).mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        agents: [],
        isEndpointLoading: true
      }
      return selector(state)
    })

    render(<ConnectionStatus />)
    expect(screen.getByText('Connecting')).toBeInTheDocument()
  })

  it('should render offline status when no agents and not loading', () => {
    vi.mocked(useStore).mockImplementation((selector: (state: unknown) => unknown) => {
      const state = {
        agents: [],
        isEndpointLoading: false
      }
      return selector(state)
    })

    render(<ConnectionStatus />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/ui/__tests__/connection-status.test.tsx`
Expected: FAIL with "Cannot find module '../connection-status'"

**Step 3: Write minimal implementation**

```typescript
// src/components/ui/connection-status.tsx
'use client'

import { useStore } from '@/store'
import { StatusBadge } from '@/components/ui/status-badge'

export function ConnectionStatus() {
  const agents = useStore((state) => state.agents)
  const isEndpointLoading = useStore((state) => state.isEndpointLoading)

  const isConnected = (agents?.length ?? 0) > 0

  const getStatus = (): 'pending' | 'online' | 'offline' => {
    if (isEndpointLoading) return 'pending'
    if (isConnected) return 'online'
    return 'offline'
  }

  return <StatusBadge status={getStatus()} size="sm" />
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/components/ui/__tests__/connection-status.test.tsx`
Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add src/components/ui/connection-status.tsx src/components/ui/__tests__/connection-status.test.tsx
git commit -m "feat(ui): add ConnectionStatus component extracted from UsageStats"
```

---

## Task 3: Add ConnectionStatus to SidebarUserProfile

**Files:**

- Modify: `src/components/chat/Sidebar/SidebarUserProfile.tsx`

**Step 1: Write the failing test**

```typescript
// Add to existing test file or create: src/components/chat/Sidebar/__tests__/SidebarUserProfile.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import SidebarUserProfile from '../SidebarUserProfile'

// Mock dependencies
vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: vi.fn(() => ({
    user: { name: 'Test User', email: 'test@example.com' },
    isLoading: false,
    isAuthenticated: true
  }))
}))

vi.mock('@/hooks/useUIPermissions', () => ({
  useUIPermissions: vi.fn(() => ({
    nav: { admin: false }
  }))
}))

vi.mock('@/store', () => ({
  useStore: vi.fn((selector) => {
    const state = {
      agents: [{ id: '1' }],
      isEndpointLoading: false
    }
    return selector(state)
  })
}))

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() }))
}))

describe('SidebarUserProfile', () => {
  it('should render ConnectionStatus below user profile', () => {
    render(<SidebarUserProfile />)
    // The ConnectionStatus should render StatusBadge with "Connected"
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/components/chat/Sidebar/__tests__/SidebarUserProfile.test.tsx`
Expected: FAIL with "Unable to find an element with the text: Connected"

**Step 3: Modify SidebarUserProfile to add ConnectionStatus**

In `src/components/chat/Sidebar/SidebarUserProfile.tsx`, add the import and render ConnectionStatus below the dropdown:

```typescript
// At top of file, add import:
import { ConnectionStatus } from '@/components/ui/connection-status'

// At the end of the return statement, after the DropdownMenu closing tag but inside the outer div:
// Change from:
  return (
    <div className="pt-2">
      <DropdownMenu>
        {/* ... existing dropdown content ... */}
      </DropdownMenu>
    </div>
  )

// To:
  return (
    <div className="space-y-3 pt-2">
      <DropdownMenu>
        {/* ... existing dropdown content ... */}
      </DropdownMenu>
      <div className="flex items-center justify-between px-2">
        <span className="text-muted-foreground text-xs font-medium uppercase">
          AgentOS
        </span>
        <ConnectionStatus />
      </div>
    </div>
  )
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/components/chat/Sidebar/__tests__/SidebarUserProfile.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/Sidebar/SidebarUserProfile.tsx src/components/chat/Sidebar/__tests__/SidebarUserProfile.test.tsx
git commit -m "feat(sidebar): add ConnectionStatus below user profile"
```

---

## Task 4: Create Context-Aware Sidebar Wrapper

Create an AppSidebar component that wraps the existing Sidebar and controls what sections are visible based on the current route.

**Files:**

- Create: `src/components/layout/AppSidebar.tsx`
- Modify: `src/components/chat/Sidebar/Sidebar.tsx` (add `showChatControls` prop)

**Step 1: Add showChatControls prop to Sidebar**

Modify `src/components/chat/Sidebar/Sidebar.tsx`:

```typescript
// Change the Sidebar component signature:
interface SidebarProps {
  showChatControls?: boolean
}

const Sidebar = ({ showChatControls = true }: SidebarProps) => {
  // ... existing code ...

  // Wrap the chat-specific sections (Mode, EntitySelector, Sessions) in a conditional:
  // Find this block in the JSX:
  {isEndpointActive && (
    <>
      <motion.div
        className="flex w-full flex-col items-start gap-2"
        // ...
      >
        <div className="text-primary text-xs font-medium uppercase">
          Mode
        </div>
        {/* ModeSelector, EntitySelector, ModelDisplay */}
      </motion.div>
      <Sessions />
    </>
  )}

  // Change to:
  {isEndpointActive && showChatControls && (
    <>
      <motion.div
        className="flex w-full flex-col items-start gap-2"
        // ...
      >
        <div className="text-primary text-xs font-medium uppercase">
          Mode
        </div>
        {/* ModeSelector, EntitySelector, ModelDisplay */}
      </motion.div>
      <Sessions />
    </>
  )}
```

**Step 2: Create AppSidebar wrapper**

```typescript
// src/components/layout/AppSidebar.tsx
'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/chat/Sidebar/Sidebar'

export function AppSidebar() {
  const pathname = usePathname()

  // Only show full chat controls on /chat route
  const showChatControls = pathname === '/chat' || pathname.startsWith('/chat/')

  return <Sidebar showChatControls={showChatControls} />
}
```

**Step 3: Run validation**

Run: `pnpm typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/layout/AppSidebar.tsx src/components/chat/Sidebar/Sidebar.tsx
git commit -m "feat(layout): add context-aware AppSidebar wrapper"
```

---

## Task 5: Integrate Global Sidebar into Main Layout

**Files:**

- Modify: `src/app/(main)/layout.tsx`
- Modify: `src/app/(main)/chat/page.tsx` (remove local Sidebar)

**Step 1: Update (main) layout to include sidebar**

Replace `src/app/(main)/layout.tsx`:

```typescript
// src/app/(main)/layout.tsx
import { ReactNode, Suspense } from 'react'
import { AppSidebar } from '@/components/layout/AppSidebar'

interface MainLayoutProps {
  children: ReactNode
}

function SidebarSkeleton() {
  return (
    <div className="h-screen w-64 shrink-0 animate-pulse bg-background px-2 py-3">
      <div className="h-4 w-20 rounded bg-muted" />
    </div>
  )
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="bg-background/80 flex h-screen">
      <Suspense fallback={<SidebarSkeleton />}>
        <AppSidebar />
      </Suspense>
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
```

**Step 2: Remove Sidebar from chat page**

Replace `src/app/(main)/chat/page.tsx`:

```typescript
// src/app/(main)/chat/page.tsx
'use client'

import { ChatArea } from '@/components/chat/ChatArea'
import { Suspense } from 'react'

export default function ChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatArea />
    </Suspense>
  )
}
```

**Step 3: Run validation**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

**Step 4: Visual verification**

Run: `pnpm dev`
Navigate to:

- `http://localhost:3000/` - Should show sidebar (no chat controls) + Dashboard
- `http://localhost:3000/chat` - Should show sidebar (with chat controls) + ChatArea

**Step 5: Commit**

```bash
git add src/app/(main)/layout.tsx src/app/(main)/chat/page.tsx
git commit -m "feat(layout): integrate global sidebar into main layout"
```

---

## Task 6: Refactor Dashboard to Remove UsageStats and HeaderActions

**Files:**

- Modify: `src/components/dashboard/Dashboard.tsx`

**Step 1: Update Dashboard component**

Replace `src/components/dashboard/Dashboard.tsx`:

```typescript
// src/components/dashboard/Dashboard.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useSession } from '@/lib/auth-client'
import { useStore } from '@/store'
import useChatActions from '@/hooks/useChatActions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuickActions } from './QuickActions'
import { PinnedAgents } from './PinnedAgents'
import { RecentSessions } from './RecentSessions'
import { TeamActivityFeed } from './TeamActivityFeed'
import { AdminMetrics } from './AdminMetrics'
import { getVisibleTabs } from './tabConfig'
import type { Role } from '@/lib/permissions'

// Default AgentOS endpoint
const DEFAULT_ENDPOINT =
  process.env.NEXT_PUBLIC_AGENT_OS_URL || 'http://localhost:8000'

export function Dashboard() {
  const { data: session } = useSession()
  const user = session?.user
  const userRole = (user?.role as Role) || undefined
  const { initialize } = useChatActions()
  const hydrated = useStore((state) => state.hydrated)
  const selectedEndpoint = useStore((state) => state.selectedEndpoint)
  const setSelectedEndpoint = useStore((state) => state.setSelectedEndpoint)
  const hasInitialized = useRef(false)

  // Get visible tabs based on user role
  const visibleTabs = getVisibleTabs(userRole)

  // Ensure endpoint is set to a valid value after hydration
  useEffect(() => {
    if (hydrated && !selectedEndpoint) {
      setSelectedEndpoint(DEFAULT_ENDPOINT)
    }
  }, [hydrated, selectedEndpoint, setSelectedEndpoint])

  // Initialize connection to AgentOS when Dashboard mounts
  useEffect(() => {
    if (hydrated && selectedEndpoint && !hasInitialized.current) {
      hasInitialized.current = true
      initialize()
    }
  }, [hydrated, selectedEndpoint, initialize])

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome{user?.name ? `, ${user.name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s an overview of your activity
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            {visibleTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PinnedAgents />
              </div>
              <div>
                <QuickActions />
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <RecentSessions />
              <TeamActivityFeed />
            </div>
          </TabsContent>

          {visibleTabs.some((t) => t.id === 'team') && (
            <TabsContent value="team">
              <div className="rounded-lg border p-6">
                <h3 className="font-semibold">Team Management</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Team management features coming soon.
                </p>
              </div>
            </TabsContent>
          )}

          {visibleTabs.some((t) => t.id === 'analytics') && (
            <TabsContent value="analytics">
              <div className="rounded-lg border p-6">
                <h3 className="font-semibold">Analytics</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  Analytics dashboard coming soon.
                </p>
              </div>
            </TabsContent>
          )}

          {visibleTabs.some((t) => t.id === 'admin') && (
            <TabsContent value="admin">
              <AdminMetrics />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  )
}
```

**Step 2: Run validation**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/dashboard/Dashboard.tsx
git commit -m "feat(dashboard): remove UsageStats, implement dynamic role-based tabs"
```

---

## Task 7: Update Enterprise Layouts for Sidebar Consistency

The enterprise routes (`/admin`, `/profile`, `/knowledge-bases`) should also use the sidebar. They need to be moved under the `(main)` route group or have the sidebar added.

**Files:**

- Move: `src/app/(enterprise)/admin/` to `src/app/(main)/admin/`
- Move: `src/app/(enterprise)/profile/` to `src/app/(main)/profile/`
- Move: `src/app/(enterprise)/knowledge-bases/` to `src/app/(main)/knowledge-bases/`
- Delete: `src/app/(enterprise)/` (after moving)

**Step 1: Move enterprise routes to main**

```bash
# Move admin (keep layout for role protection)
mv src/app/\(enterprise\)/admin src/app/\(main\)/admin

# Move profile (keep layout for auth protection)
mv src/app/\(enterprise\)/profile src/app/\(main\)/profile

# Move knowledge-bases
mv src/app/\(enterprise\)/knowledge-bases src/app/\(main\)/knowledge-bases

# Remove empty enterprise directory
rmdir src/app/\(enterprise\)
```

**Step 2: Run validation**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS

**Step 3: Visual verification**

Run: `pnpm dev`
Navigate to:

- `http://localhost:3000/admin` - Should show sidebar + admin content
- `http://localhost:3000/profile` - Should show sidebar + profile content
- `http://localhost:3000/knowledge-bases` - Should show sidebar + knowledge bases

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(routes): move enterprise routes under main layout for global sidebar"
```

---

## Task 8: Clean Up Unused Imports

**Files:**

- Modify: `src/components/dashboard/Dashboard.tsx` (verify no UsageStats import)
- Modify: `src/components/dashboard/UsageStats.tsx` (keep for potential Admin use)

**Step 1: Verify Dashboard has no unused imports**

Check that `Dashboard.tsx` does not import:

- `UsageStats`
- `HeaderActions`

**Step 2: Run full validation**

Run: `pnpm validate`
Expected: PASS (lint + format + typecheck)

**Step 3: Commit if any changes**

```bash
git add -A
git commit -m "chore: clean up unused imports"
```

---

## Task 9: Final Integration Testing

**Step 1: Run all tests**

Run: `pnpm test`
Expected: All tests PASS

**Step 2: Run E2E tests (if available)**

Run: `pnpm test:e2e`
Expected: PASS

**Step 3: Manual visual verification checklist**

| Route | Expected Behavior |
|-------|-------------------|
| `/login` | No sidebar (login page) |
| `/` | Sidebar (nav only) + Dashboard with Overview tab |
| `/` as teamLead | Sidebar + Dashboard with Overview + Team tabs |
| `/` as teamAdmin | Sidebar + Dashboard with Overview + Team + Analytics tabs |
| `/` as orgAdmin | Sidebar + Dashboard with all tabs |
| `/chat` | Sidebar (full chat controls) + ChatArea |
| `/admin` | Sidebar (nav only) + Admin content |
| `/profile` | Sidebar (nav only) + Profile content |
| `/knowledge-bases` | Sidebar (nav only) + Knowledge bases |

**Step 4: Verify StatusBadge in sidebar**

- StatusBadge should appear below user profile dropdown in sidebar
- Should show "Connected" (green), "Connecting" (blue), or "Offline" (amber)

**Step 5: Final commit**

```bash
git add -A
git commit -m "test: verify dashboard and sidebar integration"
```

---

## Validation Checklist

- [ ] All roles see same Overview content (PinnedAgents, QuickActions, RecentSessions, TeamActivityFeed)
- [ ] UsageStats removed from Overview tab
- [ ] HeaderActions removed from Dashboard (theme/avatar in sidebar)
- [ ] StatusBadge visible in sidebar below user profile
- [ ] Tabs dynamically rendered based on user role
- [ ] Sidebar visible on all authenticated pages
- [ ] Chat controls only visible on `/chat` route
- [ ] TypeScript compilation passes (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] All tests pass (`pnpm test`)

---

## Rollback Plan

If issues arise, revert all changes:

```bash
git revert HEAD~9..HEAD
```

Or selectively revert specific commits by examining:

```bash
git log --oneline -15
```
