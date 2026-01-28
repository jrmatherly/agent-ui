# Admin Dashboard Tabs - Detailed Implementation Plan

## Executive Summary

Implement real data for all 6 tabs in the Admin Dashboard (`/admin` page). Currently all tabs show placeholders except Audit Logs which has UI but a missing API route.

---

## Phase 1: Quick Wins (Audit Logs + Overview)

### 1.1 Audit Logs API Route

**File:** `src/app/api/admin/audit-logs/route.ts`

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
    // Build where conditions
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

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditEvent)
      .where(whereClause)
    const total = countResult?.count ?? 0

    // Get paginated logs
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

### 1.2 Overview Tab Implementation

**Modify:** `src/components/enterprise/admin/AdminDashboard.tsx`

Replace `AdminOverview` function:

```typescript
import { useAdminMetrics } from '@/hooks/useAdminMetrics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Activity, Bot, MessageSquare, Clock, AlertTriangle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

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

---

## Phase 2: Members Tab

### 2.1 Members API Route

**File:** `src/app/api/admin/members/route.ts`

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
    // Build where conditions
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

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereClause)
    const total = countResult?.count ?? 0

    // Get members with last active time (subquery for last session)
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

    // Get last active times for these users
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

### 2.2 Members Hook

**File:** `src/hooks/useAdminMembers.ts`

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

### 2.3 Members Component

**Replace `MemberManagement` in AdminDashboard.tsx:**

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
      {/* Filters */}
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

      {/* Table */}
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
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                        <p className="text-xs text-muted-foreground">{member.email}</p>
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

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
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
          <span className="py-2 px-3 text-sm">Page {filters.page}</span>
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

---

## Phase 3: Agents Tab

### 3.1 Agents API Route

**File:** `src/app/api/admin/agents/route.ts`

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
    // Fetch agents from AgentOS
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

    // Get session stats per agent from local DB
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

    // Merge agent data with session stats
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

### 3.2 Agents Hook

**File:** `src/hooks/useAdminAgents.ts`

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
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000
  })
}
```

### 3.3 Agents Component

**Replace `AgentManagement` in AdminDashboard.tsx:**

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
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                No agents configured
              </TableCell>
            </TableRow>
          ) : (
            data?.agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-muted-foreground" />
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

---

## Phase 4: Usage Tab

### 4.1 Usage API Route

**File:** `src/app/api/admin/usage/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user, agentSession, knowledgeBase } from '@/lib/db/schema'
import { sql, gte, eq } from 'drizzle-orm'

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

    // Session metrics
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

    // By entity type
    const byEntityType = await db
      .select({
        entityType: agentSession.entityType,
        count: sql<number>`count(*)`
      })
      .from(agentSession)
      .groupBy(agentSession.entityType)

    // Average message count
    const [avgMessages] = await db
      .select({ avg: sql<number>`avg(${agentSession.messageCount})` })
      .from(agentSession)

    // User metrics
    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(user)
    const [newUsersWeek] = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(gte(user.createdAt, weekAgo))

    // Role distribution
    const roleDistribution = await db
      .select({
        role: user.role,
        count: sql<number>`count(*)`
      })
      .from(user)
      .groupBy(user.role)

    // Knowledge base metrics
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

### 4.2 Usage Hook

**File:** `src/hooks/useAdminUsage.ts`

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

### 4.3 Usage Component

**Replace `UsageMetrics` in AdminDashboard.tsx:**

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
      {/* Session Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Session Activity</h3>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Today</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.sessions.today}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.sessions.thisWeek}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.sessions.thisMonth}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Avg Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.sessions.avgMessageCount}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Users</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.users.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">New This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.users.newThisWeek}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Role Distribution</CardTitle>
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

      {/* Knowledge Base Metrics */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Knowledge Bases</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Bases</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.knowledge.totalBases}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.knowledge.totalDocuments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Storage Used</CardTitle>
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

---

## Phase 5: System Tab

### 5.1 System API Route

**File:** `src/app/api/admin/system/route.ts`

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
    // Check AgentOS health
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

    // Count SSO providers
    const [ssoCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ssoProvider)

    // Count webhooks
    const [webhooksCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(webhookEndpoint)

    return NextResponse.json({
      health: {
        agentOS: agentOSHealth,
        database: { status: 'healthy' } // If we got here, DB is working
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

### 5.2 System Hook

**File:** `src/hooks/useAdminSystem.ts`

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

### 5.3 System Component

**Replace `SystemSettings` in AdminDashboard.tsx:**

```typescript
function SystemSettings() {
  const { data, isLoading, refetch } = useAdminSystem()

  if (isLoading) {
    return <div className="p-4">Loading system info...</div>
  }

  if (!data) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500'
      case 'unhealthy': return 'text-red-500'
      default: return 'text-yellow-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            System Health
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
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

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">AgentOS URL</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
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

      {/* Version Info */}
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

---

## Files Summary

### Files to Create (9 files)

| Path | Purpose |
|------|---------|
| `src/app/api/admin/audit-logs/route.ts` | Audit logs query API with filtering |
| `src/app/api/admin/members/route.ts` | Members list with search/filter |
| `src/app/api/admin/agents/route.ts` | Agents with session statistics |
| `src/app/api/admin/usage/route.ts` | Usage metrics aggregation |
| `src/app/api/admin/system/route.ts` | System health and config |
| `src/hooks/useAdminMembers.ts` | Members data hook |
| `src/hooks/useAdminAgents.ts` | Agents data hook |
| `src/hooks/useAdminUsage.ts` | Usage metrics hook |
| `src/hooks/useAdminSystem.ts` | System info hook |

### Files to Modify (1 file)

| Path | Changes |
|------|---------|
| `src/components/enterprise/admin/AdminDashboard.tsx` | Replace 5 placeholder functions, add imports |

---

## Verification Steps

After each phase, run:

```bash
pnpm validate && pnpm build
```

### Manual Testing Checklist

1. **Audit Logs Tab**:
   - Filter by category works
   - Filter by severity works
   - Search finds matching entries
   - Pagination works

2. **Overview Tab**:
   - Shows 6 metric cards with real data
   - Loading state displays correctly

3. **Members Tab**:
   - Table displays users
   - Search filters by name/email
   - Role filter works
   - Pagination works

4. **Agents Tab**:
   - Lists all agents from AgentOS
   - Shows session counts per agent
   - Shows last used dates

5. **Usage Tab**:
   - Session counts are accurate
   - Time-based metrics show correct periods
   - Knowledge base stats display

6. **System Tab**:
   - AgentOS health shows green/red correctly
   - Database shows healthy
   - Config values display
   - Refresh button works
