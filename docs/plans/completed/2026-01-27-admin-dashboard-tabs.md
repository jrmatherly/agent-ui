# Admin Dashboard Tabs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement real data for all 6 tabs in the Admin Dashboard (`/admin` page), replacing "Coming Soon" placeholders with functional components.

**Architecture:** Each tab follows API route → React Query hook → Component pattern. API routes use Drizzle ORM for database queries with admin role checks. Components use existing shadcn/ui primitives.

**Tech Stack:** Next.js 16 API routes, Drizzle ORM, React Query, TypeScript, shadcn/ui components

---

## Validation Summary (2026-01-27)

All schema field references and API patterns have been validated against the codebase:

| Task | Status | Notes |
|------|--------|-------|
| 1. Audit Logs API | ✅ VALIDATED | Route needed, `AuditLogViewer` expects this endpoint |
| 2. Overview Tab | ✅ VALIDATED | Hook/API already exist, only component update needed |
| 3. Members API | ✅ VALIDATED | All `user` and `session` schema fields correct |
| 4. Members Hook | ✅ VALIDATED | React Query patterns correct |
| 5. Members Tab | ✅ VALIDATED | shadcn component usage correct |
| 6. Agents API | ✅ VALIDATED | `agentSession` schema fields correct |
| 7. Agents Hook | ✅ VALIDATED | React Query patterns correct |
| 8. Agents Tab | ✅ VALIDATED | Component implementation correct |
| 9. Usage API | ✅ VALIDATED | All schema fields verified |
| 10. Usage Hook | ✅ VALIDATED | React Query patterns correct |
| 11. Usage Tab | ✅ VALIDATED | Component implementation correct |
| 12. System API | ✅ VALIDATED | `ssoProvider`, `webhookEndpoint` tables exist |
| 13. System Hook | ✅ VALIDATED | React Query patterns correct |
| 14. System Tab | ✅ VALIDATED | Component implementation correct |
| 15. Final Verify | ✅ VALIDATED | Standard verification steps |

---

## Task 1: Audit Logs API Route

**Files:**

- Create: `src/app/api/admin/audit-logs/route.ts`

**Step 1: Create the API route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { auditEvent } from '@/lib/db/schema'
import { desc, eq, like, or, sql, and } from 'drizzle-orm'

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

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const severity = searchParams.get('severity')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  try {
    const conditions = []
    if (category && category !== 'all') {
      conditions.push(eq(auditEvent.category, category))
    }
    if (severity && severity !== 'all') {
      conditions.push(eq(auditEvent.severity, severity))
    }
    if (search) {
      conditions.push(
        or(
          like(auditEvent.actorEmail, `%${search}%`),
          like(auditEvent.action, `%${search}%`),
          like(auditEvent.resourceName, `%${search}%`)
        )
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditEvent)
      .where(whereClause)
    const total = countResult?.count ?? 0

    const logs = await db
      .select({
        id: auditEvent.id,
        timestamp: auditEvent.timestamp,
        actorType: auditEvent.actorType,
        actorId: auditEvent.actorId,
        actorEmail: auditEvent.actorEmail,
        actorRole: auditEvent.actorRole,
        action: auditEvent.action,
        category: auditEvent.category,
        severity: auditEvent.severity,
        resourceType: auditEvent.resourceType,
        resourceId: auditEvent.resourceId,
        resourceName: auditEvent.resourceName,
        outcome: auditEvent.outcome,
        elevated: auditEvent.elevated
      })
      .from(auditEvent)
      .where(whereClause)
      .orderBy(desc(auditEvent.timestamp))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({
      logs,
      total,
      hasMore: offset + logs.length < total
    })
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
```

**Step 2: Validate and build**

Run: `pnpm validate && pnpm build`
Expected: PASS with no errors

**Step 3: Commit**

```bash
git add src/app/api/admin/audit-logs/route.ts
git commit -m "feat(admin): add audit logs API route"
```

---

## Task 2: Overview Tab - Update AdminOverview Component

> **VALIDATED**: The `useAdminMetrics` hook already exists at `src/hooks/useAdminMetrics.ts` and the API route exists at `src/app/api/admin/metrics/route.ts`. This task only requires updating the AdminDashboard component.

**Files:**

- Modify: `src/components/enterprise/admin/AdminDashboard.tsx:74-78`

**Step 1: Add imports at top of file**

Add after existing imports (line ~8):

```typescript
import { useAdminMetrics } from '@/hooks/useAdminMetrics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Activity, Bot, MessageSquare, Clock, AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
```

**Step 2: Replace AdminOverview function**

Replace the placeholder function (lines 74-78) with:

```typescript
function AdminOverview() {
  const { data: metrics, isLoading, error } = useAdminMetrics()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-destructive">Failed to load metrics</p>
      </div>
    )
  }

  const cards = [
    { title: 'Total Users', value: metrics.totalUsers, icon: Users },
    { title: 'Active Users (24h)', value: metrics.activeUsers, icon: Activity },
    { title: 'Total Agents', value: metrics.totalAgents, icon: Bot },
    { title: 'Total Sessions', value: metrics.totalSessions, icon: MessageSquare },
    { title: 'Avg Session Duration', value: metrics.avgSessionDuration, icon: Clock },
    { title: 'Error Rate', value: metrics.errorRate, icon: AlertTriangle }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

**Step 3: Validate and build**

Run: `pnpm validate && pnpm build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/enterprise/admin/AdminDashboard.tsx
git commit -m "feat(admin): implement Overview tab with real metrics"
```

---

## Task 3: Members API Route

**Files:**

- Create: `src/app/api/admin/members/route.ts`

**Step 1: Create the API route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user, session } from '@/lib/db/schema'
import { desc, eq, like, or, sql, and, max } from 'drizzle-orm'

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

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const role = searchParams.get('role')
  const ssoOnly = searchParams.get('sso') === 'true'
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  try {
    const conditions = []
    if (search) {
      conditions.push(
        or(
          like(user.name, `%${search}%`),
          like(user.email, `%${search}%`)
        )
      )
    }
    if (role && role !== 'all') {
      conditions.push(eq(user.role, role as any))
    }
    if (ssoOnly) {
      conditions.push(sql`${user.ssoProvider} IS NOT NULL`)
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereClause)
    const total = countResult?.count ?? 0

    const members = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        jobTitle: user.jobTitle,
        ssoProvider: user.ssoProvider,
        ssoLastSync: user.ssoLastSync,
        banned: user.banned,
        createdAt: user.createdAt,
        image: user.image
      })
      .from(user)
      .where(whereClause)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset)

    const userIds = members.map(m => m.id)
    const lastActiveTimes = userIds.length > 0
      ? await db
          .select({
            userId: session.userId,
            lastActive: max(session.createdAt)
          })
          .from(session)
          .where(sql`${session.userId} IN ${userIds}`)
          .groupBy(session.userId)
      : []

    const lastActiveMap = new Map(
      lastActiveTimes.map(r => [r.userId, r.lastActive])
    )

    const membersWithActivity = members.map(m => ({
      ...m,
      lastActiveAt: lastActiveMap.get(m.id) || null
    }))

    return NextResponse.json({
      members: membersWithActivity,
      total,
      page,
      limit
    })
  } catch (error) {
    console.error('Failed to fetch members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
```

**Step 2: Validate and build**

Run: `pnpm validate && pnpm build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/api/admin/members/route.ts
git commit -m "feat(admin): add members API route with filtering"
```

---

## Task 4: Members Hook

**Files:**

- Create: `src/hooks/useAdminMembers.ts`

**Step 1: Create the hook file**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

export interface AdminMember {
  id: string
  name: string
  email: string
  role: string
  department?: string
  jobTitle?: string
  ssoProvider?: string
  ssoLastSync?: string
  banned: boolean
  createdAt: string
  image?: string
  lastActiveAt?: string
}

export interface MembersFilters {
  search?: string
  role?: string
  sso?: boolean
  page: number
  limit: number
}

interface MembersResponse {
  members: AdminMember[]
  total: number
  page: number
  limit: number
}

async function fetchMembers(filters: MembersFilters): Promise<MembersResponse> {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.role && filters.role !== 'all') params.set('role', filters.role)
  if (filters.sso) params.set('sso', 'true')
  params.set('page', String(filters.page))
  params.set('limit', String(filters.limit))

  const response = await fetch(`/api/admin/members?${params}`)
  if (!response.ok) throw new Error('Failed to fetch members')
  return response.json()
}

export function useAdminMembers(initialFilters?: Partial<MembersFilters>) {
  const [filters, setFilters] = useState<MembersFilters>({
    page: 1,
    limit: 50,
    ...initialFilters
  })

  const query = useQuery({
    queryKey: ['adminMembers', filters],
    queryFn: () => fetchMembers(filters),
    staleTime: 30000
  })

  return {
    ...query,
    filters,
    setFilters,
    setPage: (page: number) => setFilters(f => ({ ...f, page })),
    setSearch: (search: string) => setFilters(f => ({ ...f, search, page: 1 })),
    setRole: (role: string) => setFilters(f => ({ ...f, role, page: 1 }))
  }
}
```

**Step 2: Validate**

Run: `pnpm validate`
Expected: PASS

**Step 3: Commit**

```bash
git add src/hooks/useAdminMembers.ts
git commit -m "feat(admin): add useAdminMembers hook"
```

---

## Task 5: Members Tab Component

**Files:**

- Modify: `src/components/enterprise/admin/AdminDashboard.tsx`

**Step 1: Add imports**

Add after existing imports:

```typescript
import { useAdminMembers } from '@/hooks/useAdminMembers'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
```

**Step 2: Replace MemberManagement function**

Replace the placeholder function with:

```typescript
function MemberManagement() {
  const {
    data,
    isLoading,
    filters,
    setSearch,
    setRole,
    setPage
  } = useAdminMembers()

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Input
          placeholder="Search by name or email..."
          value={filters.search || ''}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={filters.role || 'all'} onValueChange={setRole}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="powerUser">Power User</SelectItem>
            <SelectItem value="teamLead">Team Lead</SelectItem>
            <SelectItem value="teamAdmin">Team Admin</SelectItem>
            <SelectItem value="orgAdmin">Org Admin</SelectItem>
            <SelectItem value="globalAdmin">Global Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>SSO</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              data?.members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.image || ''} />
                        <AvatarFallback>
                          {member.name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-muted-foreground text-xs">{member.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{member.role}</Badge>
                  </TableCell>
                  <TableCell>{member.department || '-'}</TableCell>
                  <TableCell>
                    {member.ssoProvider ? (
                      <Badge variant="secondary">{member.ssoProvider}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(member.lastActiveAt)}</TableCell>
                  <TableCell>
                    {member.banned ? (
                      <Badge variant="destructive">Banned</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {data?.total ? `${data.total} total members` : ''}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page <= 1}
            onClick={() => setPage(filters.page - 1)}
          >
            Previous
          </Button>
          <span className="px-3 py-2 text-sm">Page {filters.page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data || data.members.length < filters.limit}
            onClick={() => setPage(filters.page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Validate and build**

Run: `pnpm validate && pnpm build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/enterprise/admin/AdminDashboard.tsx
git commit -m "feat(admin): implement Members tab with table and filters"
```

---

## Task 6: Agents API Route

**Files:**

- Create: `src/app/api/admin/agents/route.ts`

**Step 1: Create the API route file**

```typescript
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
    let agentsFromBackend: any[] = []

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

    const statsMap = new Map(
      sessionStats.map(s => [s.entityId, s])
    )

    const agents = agentsFromBackend.map(agent => ({
      id: agent.agent_id || agent.id,
      name: agent.name,
      model: agent.model,
      sessionStats: {
        total: statsMap.get(agent.agent_id || agent.id)?.totalSessions ?? 0,
        active: statsMap.get(agent.agent_id || agent.id)?.activeSessions ?? 0,
        lastUsed: statsMap.get(agent.agent_id || agent.id)?.lastUsed ?? null
      }
    }))

    return NextResponse.json({ agents })
  } catch (error) {
    console.error('Failed to fetch agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}
```

**Step 2: Validate and build**

Run: `pnpm validate && pnpm build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/api/admin/agents/route.ts
git commit -m "feat(admin): add agents API route with session stats"
```

---

## Task 7: Agents Hook

**Files:**

- Create: `src/hooks/useAdminAgents.ts`

**Step 1: Create the hook file**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

export interface AdminAgent {
  id: string
  name: string
  model?: {
    name?: string
    model?: string
    provider?: string
  }
  sessionStats: {
    total: number
    active: number
    lastUsed: string | null
  }
}

async function fetchAgents(): Promise<{ agents: AdminAgent[] }> {
  const response = await fetch('/api/admin/agents')
  if (!response.ok) throw new Error('Failed to fetch agents')
  return response.json()
}

export function useAdminAgents() {
  return useQuery({
    queryKey: ['adminAgents'],
    queryFn: fetchAgents,
    refetchInterval: 60000,
    staleTime: 30000
  })
}
```

**Step 2: Validate**

Run: `pnpm validate`
Expected: PASS

**Step 3: Commit**

```bash
git add src/hooks/useAdminAgents.ts
git commit -m "feat(admin): add useAdminAgents hook"
```

---

## Task 8: Agents Tab Component

**Files:**

- Modify: `src/components/enterprise/admin/AdminDashboard.tsx`

**Step 1: Add import**

Add to imports:

```typescript
import { useAdminAgents } from '@/hooks/useAdminAgents'
```

**Step 2: Replace AgentManagement function**

Replace the placeholder function with:

```typescript
function AgentManagement() {
  const { data, isLoading } = useAdminAgents()

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString()
  }

  if (isLoading) {
    return <div className="p-4">Loading agents...</div>
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Total Sessions</TableHead>
            <TableHead>Active Sessions</TableHead>
            <TableHead>Last Used</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.agents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                No agents configured
              </TableCell>
            </TableRow>
          ) : (
            data?.agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Bot className="text-muted-foreground h-4 w-4" />
                    <span className="font-medium">{agent.name || agent.id}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {agent.model?.model || agent.model?.provider || '-'}
                </TableCell>
                <TableCell>{agent.sessionStats.total}</TableCell>
                <TableCell>
                  <Badge variant={agent.sessionStats.active > 0 ? 'default' : 'secondary'}>
                    {agent.sessionStats.active}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(agent.sessionStats.lastUsed)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

**Step 3: Validate and build**

Run: `pnpm validate && pnpm build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/enterprise/admin/AdminDashboard.tsx
git commit -m "feat(admin): implement Agents tab with session stats"
```

---

## Task 9: Usage API Route

**Files:**

- Create: `src/app/api/admin/usage/route.ts`

**Step 1: Create the API route file**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user, agentSession, knowledgeBase } from '@/lib/db/schema'
import { sql, gte } from 'drizzle-orm'

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
    const now = new Date()
    const today = new Date(now.setHours(0, 0, 0, 0))
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [totalSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentSession)

    const [todaySessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentSession)
      .where(gte(agentSession.createdAt, today))

    const [weekSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentSession)
      .where(gte(agentSession.createdAt, weekAgo))

    const [monthSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentSession)
      .where(gte(agentSession.createdAt, monthAgo))

    const byEntityType = await db
      .select({
        entityType: agentSession.entityType,
        count: sql<number>`count(*)`
      })
      .from(agentSession)
      .groupBy(agentSession.entityType)

    const [avgMessages] = await db
      .select({ avg: sql<number>`avg(${agentSession.messageCount})` })
      .from(agentSession)

    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(user)
    const [newUsersWeek] = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(gte(user.createdAt, weekAgo))

    const roleDistribution = await db
      .select({
        role: user.role,
        count: sql<number>`count(*)`
      })
      .from(user)
      .groupBy(user.role)

    const [kbMetrics] = await db
      .select({
        totalBases: sql<number>`count(*)`,
        totalDocuments: sql<number>`coalesce(sum(${knowledgeBase.documentCount}), 0)`,
        totalSizeBytes: sql<number>`coalesce(sum(${knowledgeBase.totalSizeBytes}), 0)`
      })
      .from(knowledgeBase)

    return NextResponse.json({
      sessions: {
        total: totalSessions?.count ?? 0,
        today: todaySessions?.count ?? 0,
        thisWeek: weekSessions?.count ?? 0,
        thisMonth: monthSessions?.count ?? 0,
        byEntityType: Object.fromEntries(
          byEntityType.map(r => [r.entityType, r.count])
        ),
        avgMessageCount: Math.round(avgMessages?.avg ?? 0)
      },
      users: {
        total: totalUsers?.count ?? 0,
        newThisWeek: newUsersWeek?.count ?? 0,
        byRole: Object.fromEntries(
          roleDistribution.map(r => [r.role, r.count])
        )
      },
      knowledge: {
        totalBases: kbMetrics?.totalBases ?? 0,
        totalDocuments: kbMetrics?.totalDocuments ?? 0,
        totalSizeBytes: kbMetrics?.totalSizeBytes ?? 0
      }
    })
  } catch (error) {
    console.error('Failed to fetch usage metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage metrics' },
      { status: 500 }
    )
  }
}
```

**Step 2: Validate and build**

Run: `pnpm validate && pnpm build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/api/admin/usage/route.ts
git commit -m "feat(admin): add usage metrics API route"
```

---

## Task 10: Usage Hook

**Files:**

- Create: `src/hooks/useAdminUsage.ts`

**Step 1: Create the hook file**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

export interface UsageMetrics {
  sessions: {
    total: number
    today: number
    thisWeek: number
    thisMonth: number
    byEntityType: Record<string, number>
    avgMessageCount: number
  }
  users: {
    total: number
    newThisWeek: number
    byRole: Record<string, number>
  }
  knowledge: {
    totalBases: number
    totalDocuments: number
    totalSizeBytes: number
  }
}

async function fetchUsage(): Promise<UsageMetrics> {
  const response = await fetch('/api/admin/usage')
  if (!response.ok) throw new Error('Failed to fetch usage metrics')
  return response.json()
}

export function useAdminUsage() {
  return useQuery({
    queryKey: ['adminUsage'],
    queryFn: fetchUsage,
    refetchInterval: 60000,
    staleTime: 30000
  })
}
```

**Step 2: Validate**

Run: `pnpm validate`
Expected: PASS

**Step 3: Commit**

```bash
git add src/hooks/useAdminUsage.ts
git commit -m "feat(admin): add useAdminUsage hook"
```

---

## Task 11: Usage Tab Component

**Files:**

- Modify: `src/components/enterprise/admin/AdminDashboard.tsx`

**Step 1: Add import**

Add to imports:

```typescript
import { useAdminUsage } from '@/hooks/useAdminUsage'
```

**Step 2: Replace UsageMetrics function**

Replace the placeholder function with:

```typescript
function UsageMetrics() {
  const { data, isLoading } = useAdminUsage()

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  if (isLoading) {
    return <div className="p-4">Loading usage metrics...</div>
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-4 text-lg font-semibold">Session Activity</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.sessions.today}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.sessions.thisWeek}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.sessions.thisMonth}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">Avg Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.sessions.avgMessageCount}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Users</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.users.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">New This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.users.newThisWeek}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">Role Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm">
                {Object.entries(data.users.byRole).map(([role, count]) => (
                  <div key={role} className="flex justify-between">
                    <span className="text-muted-foreground">{role}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Knowledge Bases</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">Total Bases</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.knowledge.totalBases}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">Total Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.knowledge.totalDocuments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground text-sm">Storage Used</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatBytes(data.knowledge.totalSizeBytes)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Validate and build**

Run: `pnpm validate && pnpm build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/enterprise/admin/AdminDashboard.tsx
git commit -m "feat(admin): implement Usage tab with session and knowledge metrics"
```

---

## Task 12: System API Route

**Files:**

- Create: `src/app/api/admin/system/route.ts`

**Step 1: Create the API route file**

```typescript
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
    let agentOSHealth = { status: 'unknown' as const, latency: 0 }

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
```

**Step 2: Validate and build**

Run: `pnpm validate && pnpm build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/api/admin/system/route.ts
git commit -m "feat(admin): add system health API route"
```

---

## Task 13: System Hook

**Files:**

- Create: `src/hooks/useAdminSystem.ts`

**Step 1: Create the hook file**

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'

export interface SystemInfo {
  health: {
    agentOS: { status: 'healthy' | 'unhealthy' | 'unknown'; latency?: number }
    database: { status: 'healthy' | 'unhealthy' }
  }
  config: {
    agentOSUrl: string
    ssoProvidersCount: number
    webhooksCount: number
  }
  version: {
    app: string
    node: string
  }
}

async function fetchSystemInfo(): Promise<SystemInfo> {
  const response = await fetch('/api/admin/system')
  if (!response.ok) throw new Error('Failed to fetch system info')
  return response.json()
}

export function useAdminSystem() {
  return useQuery({
    queryKey: ['adminSystem'],
    queryFn: fetchSystemInfo,
    refetchInterval: 30000,
    staleTime: 10000
  })
}
```

**Step 2: Validate**

Run: `pnpm validate`
Expected: PASS

**Step 3: Commit**

```bash
git add src/hooks/useAdminSystem.ts
git commit -m "feat(admin): add useAdminSystem hook"
```

---

## Task 14: System Tab Component

**Files:**

- Modify: `src/components/enterprise/admin/AdminDashboard.tsx`

**Step 1: Add imports**

Add to imports:

```typescript
import { useAdminSystem } from '@/hooks/useAdminSystem'
import { RefreshCw } from 'lucide-react'
```

**Step 2: Replace SystemSettings function**

Replace the placeholder function with:

```typescript
function SystemSettings() {
  const { data, isLoading, refetch } = useAdminSystem()

  if (isLoading) {
    return <div className="p-4">Loading system info...</div>
  }

  if (!data) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500'
      case 'unhealthy':
        return 'text-red-500'
      default:
        return 'text-yellow-500'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            System Health
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>AgentOS Backend</span>
              <div className="flex items-center gap-2">
                <span className={getStatusColor(data.health.agentOS.status)}>
                  {data.health.agentOS.status}
                </span>
                {data.health.agentOS.latency > 0 && (
                  <span className="text-muted-foreground text-sm">
                    ({data.health.agentOS.latency}ms)
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Database</span>
              <span className={getStatusColor(data.health.database.status)}>
                {data.health.database.status}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">AgentOS URL</span>
              <code className="bg-muted rounded px-2 py-1 text-sm">
                {data.config.agentOSUrl}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">SSO Providers</span>
              <span>{data.config.ssoProvidersCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Webhooks</span>
              <span>{data.config.webhooksCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">App Version</span>
              <span>{data.version.app}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Node.js</span>
              <span>{data.version.node}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Step 3: Validate and build**

Run: `pnpm validate && pnpm build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/enterprise/admin/AdminDashboard.tsx
git commit -m "feat(admin): implement System tab with health and config"
```

---

## Task 15: Final Verification

**Step 1: Run full validation**

Run: `pnpm validate && pnpm build`
Expected: PASS with no errors

**Step 2: Manual testing**

1. Start dev server: `pnpm dev`
2. Navigate to `/admin` as globalAdmin user
3. Verify each tab:
   - **Overview**: Shows 6 metric cards with real data
   - **Members**: Table loads, search/filter work, pagination works
   - **Agents**: Table shows agents from AgentOS with session stats
   - **Usage**: Session counts, user metrics, knowledge base stats
   - **Audit Logs**: Loads logs with filtering (was already implemented)
   - **System**: Health status, config, versions display

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(admin): complete admin dashboard tabs implementation"
```

---

## Files Summary

| Task | File | Action |
|------|------|--------|
| 1 | `src/app/api/admin/audit-logs/route.ts` | Create |
| 2 | `src/components/enterprise/admin/AdminDashboard.tsx` | Modify (Overview) |
| 3 | `src/app/api/admin/members/route.ts` | Create |
| 4 | `src/hooks/useAdminMembers.ts` | Create |
| 5 | `src/components/enterprise/admin/AdminDashboard.tsx` | Modify (Members) |
| 6 | `src/app/api/admin/agents/route.ts` | Create |
| 7 | `src/hooks/useAdminAgents.ts` | Create |
| 8 | `src/components/enterprise/admin/AdminDashboard.tsx` | Modify (Agents) |
| 9 | `src/app/api/admin/usage/route.ts` | Create |
| 10 | `src/hooks/useAdminUsage.ts` | Create |
| 11 | `src/components/enterprise/admin/AdminDashboard.tsx` | Modify (Usage) |
| 12 | `src/app/api/admin/system/route.ts` | Create |
| 13 | `src/hooks/useAdminSystem.ts` | Create |
| 14 | `src/components/enterprise/admin/AdminDashboard.tsx` | Modify (System) |
| 15 | All | Final verification |
