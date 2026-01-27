# Enterprise Multi-User Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Agent UI into an enterprise-grade multi-user platform with hierarchical RBAC, SSO authentication, comprehensive audit logging, and organizational data isolation for 500+ users.

**Architecture:** Better Auth handles identity with Organization/Team plugins for multi-tenancy. AgentOS provides agent execution with JWT RBAC. PostgreSQL with row-level security enables flexible data isolation. OpenTelemetry powers observability with configurable audit logging.

**Tech Stack:** Next.js 16, React 19, Better Auth (SSO/SAML/OIDC), PostgreSQL + pgvector, Redis, Zustand, OpenTelemetry, Kubernetes/Docker

---

## Phase 1: Authentication Foundation

### Task 1.1: Install Better Auth Dependencies

**Files:**

- Modify: `package.json`

**Step 1: Add Better Auth packages**

```bash
pnpm add better-auth @better-auth/sso
```

**Step 2: Add database adapter**

```bash
pnpm add drizzle-orm postgres
```

**Step 3: Verify installation**

Run: `pnpm list better-auth`
Expected: `better-auth@x.x.x`

**Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat: add better-auth dependencies"
```

---

### Task 1.2: Create Better Auth Configuration

**Files:**

- Create: `src/lib/auth.ts`
- Create: `src/lib/auth-client.ts`

**Step 1: Create server-side auth configuration**

Create `src/lib/auth.ts`:

```typescript
import { betterAuth } from 'better-auth'
import { organization } from 'better-auth/plugins/organization'
import { admin } from 'better-auth/plugins/admin'
import { sso } from '@better-auth/sso'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from './db'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg'
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false // Enable in production
  },

  session: {
    expiresIn: 60 * 60 * 8, // 8 hours
    updateAge: 60 * 60, // Refresh every hour
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5 // 5 minutes
    }
  },

  plugins: [
    organization({
      teams: true,
      dynamicRoles: true,
      maximumTeams: 50,
      membershipLimit: 1000,
      creatorRole: 'orgAdmin',
      allowUserToCreateOrganization: false // Admin only
    }),

    admin({
      defaultRole: 'user',
      adminRoles: ['globalAdmin', 'orgAdmin'],
      impersonationSessionDuration: 3600
    }),

    sso({
      // Will be configured per-environment
      providers: []
    })
  ],

  advanced: {
    generateId: () => crypto.randomUUID()
  }
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
```

**Step 2: Create client-side auth configuration**

Create `src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from 'better-auth/react'
import { organizationClient } from 'better-auth/client/plugins'
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  plugins: [
    organizationClient(),
    adminClient()
  ]
})

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  useActiveOrganization,
  useListOrganizations
} = authClient
```

**Step 3: Commit**

```bash
git add src/lib/auth.ts src/lib/auth-client.ts
git commit -m "feat: configure better-auth with organization and admin plugins"
```

---

### Task 1.3: Create Database Schema

**Files:**

- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/index.ts`

**Step 1: Create database connection**

Create `src/lib/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

const client = postgres(connectionString)
export const db = drizzle(client, { schema })
```

**Step 2: Create schema with enterprise extensions**

Create `src/lib/db/schema.ts`:

```typescript
import { pgTable, text, timestamp, boolean, integer, jsonb, uuid, pgEnum } from 'drizzle-orm/pg-core'

// Enums
export const roleEnum = pgEnum('role', [
  'user',
  'powerUser',
  'teamLead',
  'teamAdmin',
  'orgAdmin',
  'globalAdmin'
])

export const visibilityEnum = pgEnum('visibility', [
  'private',
  'team_shared',
  'organization'
])

export const isolationLevelEnum = pgEnum('isolation_level', [
  'row',
  'schema',
  'database'
])

// Better Auth tables (auto-created, but we extend them)
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // Enterprise extensions
  role: roleEnum('role').notNull().default('user'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires')
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id),
  // Enterprise extensions
  activeOrganizationId: text('active_organization_id'),
  activeTeamId: text('active_team_id'),
  impersonatedBy: text('impersonated_by')
})

export const organization = pgTable('organization', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logo: text('logo'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  metadata: jsonb('metadata'),
  // Enterprise extensions
  parentOrgId: text('parent_org_id'), // For BU hierarchy
  isolationLevel: isolationLevelEnum('isolation_level').default('row'),
  schemaName: text('schema_name'),
  quotaConfig: jsonb('quota_config')
})

export const member = pgTable('member', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id').notNull().references(() => organization.id),
  userId: text('user_id').notNull().references(() => user.id),
  role: roleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const team = pgTable('team', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  organizationId: text('organization_id').notNull().references(() => organization.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  metadata: jsonb('metadata')
})

export const teamMember = pgTable('team_member', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => team.id),
  userId: text('user_id').notNull().references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

// Agent Sessions (enterprise-extended)
export const agentSession = pgTable('agent_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  ownerId: text('owner_id').notNull().references(() => user.id),
  orgId: text('org_id').notNull().references(() => organization.id),
  teamId: text('team_id').references(() => team.id),
  entityType: text('entity_type').notNull(), // 'agent' | 'team'
  entityId: text('entity_id').notNull(),
  visibility: visibilityEnum('visibility').notNull().default('private'),
  sharedAt: timestamp('shared_at'),
  sharedBy: text('shared_by'),
  status: text('status').notNull().default('active'),
  messageCount: integer('message_count').default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastMessageAt: timestamp('last_message_at')
})

// Audit Events
export const auditEvent = pgTable('audit_event', {
  id: uuid('id').primaryKey().defaultRandom(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  actorType: text('actor_type').notNull(), // 'user' | 'service_account' | 'system'
  actorId: text('actor_id').notNull(),
  actorEmail: text('actor_email'),
  actorRole: text('actor_role'),
  orgId: text('org_id').notNull(),
  teamId: text('team_id'),
  action: text('action').notNull(),
  category: text('category').notNull(),
  severity: text('severity').notNull().default('info'),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  resourceName: text('resource_name'),
  outcome: text('outcome').notNull(), // 'success' | 'failure' | 'denied'
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  sessionId: text('session_id'),
  detail: jsonb('detail'),
  elevated: boolean('elevated').default(false),
  retentionDays: integer('retention_days').default(90)
})

// Service Accounts
export const serviceAccount = pgTable('service_account', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'mcp_server' | 'ci_cd' | 'integration'
  ownerTeamId: text('owner_team_id').references(() => team.id),
  scopes: jsonb('scopes').notNull().default([]),
  rateLimit: jsonb('rate_limit'),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at')
})

export const apiKey = pgTable('api_key', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceAccountId: uuid('service_account_id').notNull().references(() => serviceAccount.id),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  revoked: boolean('revoked').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

// Temporary Elevation
export const temporaryElevation = pgTable('temporary_elevation', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => user.id),
  originalRole: roleEnum('original_role').notNull(),
  elevatedRole: roleEnum('elevated_role').notNull(),
  reason: text('reason').notNull(),
  grantedBy: text('granted_by').notNull().references(() => user.id),
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at')
})

// Approval Workflows
export const approvalRequest = pgTable('approval_request', {
  id: uuid('id').primaryKey().defaultRandom(),
  actionType: text('action_type').notNull(),
  actionData: jsonb('action_data').notNull(),
  requesterId: text('requester_id').notNull().references(() => user.id),
  approverRole: roleEnum('approver_role').notNull(),
  status: text('status').notNull().default('pending'),
  reason: text('reason').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  decidedAt: timestamp('decided_at'),
  decidedBy: text('decided_by').references(() => user.id),
  expiresAt: timestamp('expires_at').notNull()
})

// Knowledge Bases
export const knowledgeBase = pgTable('knowledge_base', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  scopeType: text('scope_type').notNull(), // 'organization' | 'business_unit' | 'team' | 'personal'
  orgId: text('org_id').notNull().references(() => organization.id),
  buId: text('bu_id').references(() => organization.id),
  teamId: text('team_id').references(() => team.id),
  userId: text('user_id').references(() => user.id),
  visibility: text('visibility').notNull().default('inherited'),
  config: jsonb('config'),
  documentCount: integer('document_count').default(0),
  totalSizeBytes: integer('total_size_bytes').default(0),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

// Webhooks
export const webhookEndpoint = pgTable('webhook_endpoint', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  scopeType: text('scope_type').notNull(), // 'organization' | 'business_unit' | 'team'
  scopeId: text('scope_id').notNull(),
  url: text('url').notNull(),
  method: text('method').notNull().default('POST'),
  headers: jsonb('headers'),
  authType: text('auth_type').notNull().default('none'),
  authToken: text('auth_token'), // Encrypted
  events: jsonb('events').notNull(),
  filters: jsonb('filters'),
  enabled: boolean('enabled').default(true),
  lastTriggeredAt: timestamp('last_triggered_at'),
  failureCount: integer('failure_count').default(0),
  createdBy: text('created_by').notNull().references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

// Team Quotas
export const teamQuota = pgTable('team_quota', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: text('team_id').notNull().references(() => team.id).unique(),
  maxAgents: integer('max_agents').default(10),
  maxAgentRunsPerDay: integer('max_agent_runs_per_day').default(1000),
  maxActiveSessions: integer('max_active_sessions').default(100),
  maxSessionHistoryDays: integer('max_session_history_days').default(90),
  maxKnowledgeBases: integer('max_knowledge_bases').default(5),
  maxKnowledgeSizeGb: integer('max_knowledge_size_gb').default(10),
  maxApiCallsPerMinute: integer('max_api_calls_per_minute').default(100),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
```

**Step 3: Commit**

```bash
git add src/lib/db/
git commit -m "feat: create database schema with enterprise extensions"
```

---

### Task 1.4: Create Auth API Routes

**Files:**

- Create: `src/app/api/auth/[...all]/route.ts`

**Step 1: Create catch-all auth route**

Create `src/app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

export const { GET, POST } = toNextJsHandler(auth)
```

**Step 2: Commit**

```bash
git add src/app/api/auth/
git commit -m "feat: add better-auth API routes"
```

---

### Task 1.5: Create Auth Context Provider

**Files:**

- Create: `src/components/providers/AuthProvider.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: Create auth provider component**

Create `src/components/providers/AuthProvider.tsx`:

```typescript
'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSession, useActiveOrganization } from '@/lib/auth-client'

interface AuthContextType {
  user: ReturnType<typeof useSession>['data']
  session: ReturnType<typeof useSession>['data']
  isLoading: boolean
  isAuthenticated: boolean
  organization: ReturnType<typeof useActiveOrganization>['data']
  role: string
  permissions: string[]
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: isSessionLoading } = useSession()
  const { data: organization, isPending: isOrgLoading } = useActiveOrganization()

  const isLoading = isSessionLoading || isOrgLoading
  const isAuthenticated = !!session?.user

  // Derive permissions from role
  const role = session?.user?.role || 'user'
  const permissions = getPermissionsForRole(role)

  return (
    <AuthContext.Provider
      value={{
        user: session,
        session,
        isLoading,
        isAuthenticated,
        organization,
        role,
        permissions
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

function getPermissionsForRole(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    user: ['agent:use'],
    powerUser: ['agent:use', 'agent:configure:self', 'knowledge:upload:personal', 'session:share'],
    teamLead: ['agent:use', 'agent:configure:self', 'knowledge:upload:personal', 'session:share', 'member:invite', 'member:remove', 'session:view:team'],
    teamAdmin: ['agent:use', 'agent:configure:self', 'knowledge:upload:personal', 'session:share', 'member:invite', 'member:remove', 'session:view:team', 'agent:create', 'agent:share', 'team:manage', 'knowledge:upload:team'],
    orgAdmin: ['agent:*', 'member:*', 'team:*', 'organization:update', 'knowledge:*', 'session:view:bu', 'audit:view:bu'],
    globalAdmin: ['*']
  }

  return rolePermissions[role] || rolePermissions.user
}

export function hasPermission(permissions: string[], required: string): boolean {
  if (permissions.includes('*')) return true
  if (permissions.includes(required)) return true

  // Check wildcard permissions (e.g., 'agent:*' matches 'agent:create')
  const [resource] = required.split(':')
  if (permissions.includes(`${resource}:*`)) return true

  return false
}
```

**Step 2: Update root layout to include AuthProvider**

Modify `src/app/layout.tsx` to wrap with AuthProvider (add import and wrap children).

**Step 3: Commit**

```bash
git add src/components/providers/AuthProvider.tsx src/app/layout.tsx
git commit -m "feat: add auth context provider with role-based permissions"
```

---

## Phase 2: Organization & Team Structure

### Task 2.1: Create Organization Context

**Files:**

- Create: `src/components/providers/OrgProvider.tsx`
- Create: `src/hooks/useOrgContext.ts`

**Step 1: Create organization context provider**

Create `src/components/providers/OrgProvider.tsx`:

```typescript
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useActiveOrganization, useListOrganizations, authClient } from '@/lib/auth-client'

interface OrgContextType {
  // Current context
  activeOrg: Organization | null
  activeBU: Organization | null
  activeTeam: Team | null

  // Available options
  organizations: Organization[]
  businessUnits: Organization[]
  teams: Team[]

  // Actions
  setActiveOrg: (orgId: string) => Promise<void>
  setActiveBU: (buId: string) => Promise<void>
  setActiveTeam: (teamId: string) => Promise<void>

  // Loading state
  isLoading: boolean
}

interface Organization {
  id: string
  name: string
  slug: string
  logo?: string
  parentOrgId?: string
}

interface Team {
  id: string
  name: string
  organizationId: string
}

const OrgContext = createContext<OrgContextType | null>(null)

export function OrgProvider({ children }: { children: ReactNode }) {
  const { data: activeOrganization } = useActiveOrganization()
  const { data: organizations, isPending } = useListOrganizations()

  const [activeBU, setActiveBUState] = useState<Organization | null>(null)
  const [activeTeam, setActiveTeamState] = useState<Team | null>(null)
  const [teams, setTeams] = useState<Team[]>([])

  // Derive business units (orgs with parentOrgId)
  const businessUnits = organizations?.filter(org => org.parentOrgId) || []
  const rootOrgs = organizations?.filter(org => !org.parentOrgId) || []

  const setActiveOrg = async (orgId: string) => {
    await authClient.organization.setActive({ organizationId: orgId })
  }

  const setActiveBU = async (buId: string) => {
    setActiveBUState(businessUnits.find(bu => bu.id === buId) || null)
    // Load teams for this BU
    const buTeams = await authClient.organization.listTeams({ organizationId: buId })
    setTeams(buTeams || [])
  }

  const setActiveTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    setActiveTeamState(team || null)
    if (team) {
      await authClient.organization.setActiveTeam({ teamId })
    }
  }

  return (
    <OrgContext.Provider
      value={{
        activeOrg: activeOrganization || null,
        activeBU,
        activeTeam,
        organizations: rootOrgs,
        businessUnits,
        teams,
        setActiveOrg,
        setActiveBU,
        setActiveTeam,
        isLoading: isPending
      }}
    >
      {children}
    </OrgContext.Provider>
  )
}

export function useOrgContext() {
  const context = useContext(OrgContext)
  if (!context) {
    throw new Error('useOrgContext must be used within OrgProvider')
  }
  return context
}
```

**Step 2: Commit**

```bash
git add src/components/providers/OrgProvider.tsx
git commit -m "feat: add organization context provider with hierarchy support"
```

---

### Task 2.2: Create Context Switcher Components

**Files:**

- Create: `src/components/enterprise/context/OrgSwitcher.tsx`
- Create: `src/components/enterprise/context/BUSwitcher.tsx`
- Create: `src/components/enterprise/context/TeamSwitcher.tsx`

**Step 1: Create OrgSwitcher component**

Create `src/components/enterprise/context/OrgSwitcher.tsx`:

```typescript
'use client'

import { useOrgContext } from '@/components/providers/OrgProvider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Building2 } from 'lucide-react'

export function OrgSwitcher() {
  const { activeOrg, organizations, setActiveOrg, isLoading } = useOrgContext()

  if (isLoading) {
    return <div className="w-[200px] h-9 bg-muted animate-pulse rounded-md" />
  }

  if (organizations.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="h-4 w-4" />
        <span className="font-medium">{activeOrg?.name || 'Organization'}</span>
      </div>
    )
  }

  return (
    <Select value={activeOrg?.id} onValueChange={setActiveOrg}>
      <SelectTrigger className="w-[200px]">
        <Building2 className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

**Step 2: Create BUSwitcher component**

Create `src/components/enterprise/context/BUSwitcher.tsx`:

```typescript
'use client'

import { useOrgContext } from '@/components/providers/OrgProvider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Building } from 'lucide-react'

export function BUSwitcher() {
  const { activeBU, businessUnits, setActiveBU, isLoading } = useOrgContext()

  if (isLoading || businessUnits.length === 0) {
    return null
  }

  return (
    <Select value={activeBU?.id || ''} onValueChange={setActiveBU}>
      <SelectTrigger className="w-[180px]">
        <Building className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Business Unit" />
      </SelectTrigger>
      <SelectContent>
        {businessUnits.map((bu) => (
          <SelectItem key={bu.id} value={bu.id}>
            {bu.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

**Step 3: Create TeamSwitcher component**

Create `src/components/enterprise/context/TeamSwitcher.tsx`:

```typescript
'use client'

import { useOrgContext } from '@/components/providers/OrgProvider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Users } from 'lucide-react'

export function TeamSwitcher() {
  const { activeTeam, teams, setActiveTeam, isLoading } = useOrgContext()

  if (isLoading || teams.length === 0) {
    return null
  }

  return (
    <Select value={activeTeam?.id || ''} onValueChange={setActiveTeam}>
      <SelectTrigger className="w-[160px]">
        <Users className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Team" />
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

**Step 4: Create index export**

Create `src/components/enterprise/context/index.ts`:

```typescript
export { OrgSwitcher } from './OrgSwitcher'
export { BUSwitcher } from './BUSwitcher'
export { TeamSwitcher } from './TeamSwitcher'
```

**Step 5: Commit**

```bash
git add src/components/enterprise/context/
git commit -m "feat: add organization, BU, and team switcher components"
```

---

## Phase 3: Role-Based Access Control

### Task 3.1: Create Permission Utilities

**Files:**

- Create: `src/lib/permissions.ts`
- Create: `src/components/enterprise/common/PermissionGate.tsx`

**Step 1: Create permissions utility**

Create `src/lib/permissions.ts`:

```typescript
export type Role = 'user' | 'powerUser' | 'teamLead' | 'teamAdmin' | 'orgAdmin' | 'globalAdmin'

export const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  powerUser: 1,
  teamLead: 2,
  teamAdmin: 3,
  orgAdmin: 4,
  globalAdmin: 5
}

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  user: [
    'agent:use'
  ],
  powerUser: [
    'agent:use',
    'agent:configure:self',
    'knowledge:upload:personal',
    'session:share',
    'session:export:own'
  ],
  teamLead: [
    'agent:use',
    'agent:configure:self',
    'knowledge:upload:personal',
    'session:share',
    'session:export:own',
    'member:invite',
    'member:remove',
    'session:view:team'
  ],
  teamAdmin: [
    'agent:use',
    'agent:configure:self',
    'knowledge:upload:personal',
    'session:share',
    'session:export:own',
    'member:invite',
    'member:remove',
    'session:view:team',
    'agent:create',
    'agent:delete',
    'agent:share',
    'team:manage',
    'knowledge:create:team',
    'knowledge:upload:team',
    'webhook:create:team',
    'integration:view'
  ],
  orgAdmin: [
    'agent:*',
    'member:*',
    'team:*',
    'organization:update',
    'knowledge:*',
    'session:view:bu',
    'audit:view:bu',
    'webhook:create:bu',
    'integration:configure',
    'quota:manage'
  ],
  globalAdmin: ['*']
}

export function hasPermission(userPermissions: string[], required: string): boolean {
  // Global admin wildcard
  if (userPermissions.includes('*')) return true

  // Exact match
  if (userPermissions.includes(required)) return true

  // Wildcard match (e.g., 'agent:*' matches 'agent:create')
  const parts = required.split(':')
  for (let i = parts.length - 1; i >= 0; i--) {
    const wildcardPermission = [...parts.slice(0, i), '*'].join(':')
    if (userPermissions.includes(wildcardPermission)) return true
  }

  return false
}

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

export function getPermissionsForRole(role: Role): string[] {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user
}

export function canDelegateRole(delegatorRole: Role, targetRole: Role): boolean {
  const delegationRules: Record<Role, Role[]> = {
    user: [],
    powerUser: [],
    teamLead: ['user', 'powerUser'],
    teamAdmin: ['user', 'powerUser', 'teamLead'],
    orgAdmin: ['user', 'powerUser', 'teamLead', 'teamAdmin'],
    globalAdmin: ['user', 'powerUser', 'teamLead', 'teamAdmin', 'orgAdmin', 'globalAdmin']
  }

  return delegationRules[delegatorRole]?.includes(targetRole) || false
}
```

**Step 2: Create PermissionGate component**

Create `src/components/enterprise/common/PermissionGate.tsx`:

```typescript
'use client'

import { ReactNode } from 'react'
import { useAuth, hasPermission as checkPermission } from '@/components/providers/AuthProvider'
import type { Role } from '@/lib/permissions'
import { hasRole } from '@/lib/permissions'

interface PermissionGateProps {
  children: ReactNode
  fallback?: ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  role?: Role
}

export function PermissionGate({
  children,
  fallback = null,
  permission,
  permissions,
  requireAll = false,
  role
}: PermissionGateProps) {
  const { permissions: userPermissions, role: userRole } = useAuth()

  // Check role requirement
  if (role && !hasRole(userRole as Role, role)) {
    return <>{fallback}</>
  }

  // Check single permission
  if (permission && !checkPermission(userPermissions, permission)) {
    return <>{fallback}</>
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    const hasPermissions = requireAll
      ? permissions.every(p => checkPermission(userPermissions, p))
      : permissions.some(p => checkPermission(userPermissions, p))

    if (!hasPermissions) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}
```

**Step 3: Commit**

```bash
git add src/lib/permissions.ts src/components/enterprise/common/PermissionGate.tsx
git commit -m "feat: add permission utilities and PermissionGate component"
```

---

### Task 3.2: Create UI Permission Hooks

**Files:**

- Create: `src/hooks/useUIPermissions.ts`

**Step 1: Create UI permissions hook**

Create `src/hooks/useUIPermissions.ts`:

```typescript
'use client'

import { useMemo } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { hasPermission } from '@/lib/permissions'

export interface UIPermissions {
  nav: {
    chat: boolean
    agents: boolean
    teams: boolean
    knowledgeBases: boolean
    sessions: boolean
    admin: boolean
    globalSettings: boolean
  }
  actions: {
    createAgent: boolean
    shareAgent: boolean
    deleteAgent: boolean
    inviteMember: boolean
    removeMember: boolean
    exportSession: boolean
    shareSession: boolean
    viewAuditLogs: boolean
    manageIntegrations: boolean
    manageQuotas: boolean
  }
  data: {
    showOtherTeamAgents: boolean
    showAllSessions: boolean
    showTeamSessions: boolean
    showUsageMetrics: boolean
    showCostData: boolean
    showAuditLogs: boolean
  }
}

export function useUIPermissions(): UIPermissions {
  const { permissions, role } = useAuth()

  return useMemo(() => ({
    nav: {
      chat: true,
      agents: true,
      teams: hasPermission(permissions, 'member:invite'),
      knowledgeBases: hasPermission(permissions, 'knowledge:upload:personal'),
      sessions: true,
      admin: hasPermission(permissions, 'team:manage'),
      globalSettings: role === 'globalAdmin'
    },
    actions: {
      createAgent: hasPermission(permissions, 'agent:create'),
      shareAgent: hasPermission(permissions, 'agent:share'),
      deleteAgent: hasPermission(permissions, 'agent:delete'),
      inviteMember: hasPermission(permissions, 'member:invite'),
      removeMember: hasPermission(permissions, 'member:remove'),
      exportSession: hasPermission(permissions, 'session:export:own'),
      shareSession: hasPermission(permissions, 'session:share'),
      viewAuditLogs: hasPermission(permissions, 'audit:view:bu'),
      manageIntegrations: hasPermission(permissions, 'integration:configure'),
      manageQuotas: hasPermission(permissions, 'quota:manage')
    },
    data: {
      showOtherTeamAgents: hasPermission(permissions, 'agent:*'),
      showAllSessions: role === 'globalAdmin',
      showTeamSessions: hasPermission(permissions, 'session:view:team'),
      showUsageMetrics: hasPermission(permissions, 'team:manage'),
      showCostData: hasPermission(permissions, 'organization:update'),
      showAuditLogs: hasPermission(permissions, 'audit:view:bu')
    }
  }), [permissions, role])
}
```

**Step 2: Commit**

```bash
git add src/hooks/useUIPermissions.ts
git commit -m "feat: add UI permissions hook for role-based rendering"
```

---

## Phase 4: Audit Logging System

### Task 4.1: Create Audit Logger Service

**Files:**

- Create: `src/lib/audit/logger.ts`
- Create: `src/lib/audit/types.ts`

**Step 1: Create audit types**

Create `src/lib/audit/types.ts`:

```typescript
export type AuditCategory =
  | 'authentication'
  | 'authorization'
  | 'agent_execution'
  | 'data_access'
  | 'configuration'
  | 'membership'
  | 'admin_action'
  | 'system'

export type AuditSeverity = 'info' | 'warning' | 'critical'

export type AuditOutcome = 'success' | 'failure' | 'denied'

export interface AuditActor {
  type: 'user' | 'service_account' | 'system'
  id: string
  email?: string
  role?: string
  orgId: string
  teamId?: string
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  elevated?: boolean
  impersonatedBy?: string
}

export interface AuditResource {
  type: string
  id: string
  name?: string
  orgId: string
  teamId?: string
}

export interface AuditEventInput {
  action: string
  category: AuditCategory
  severity?: AuditSeverity
  actor: AuditActor
  resource?: AuditResource
  outcome: AuditOutcome
  error?: {
    code: string
    message: string
  }
  detail?: Record<string, unknown>
  retentionDays?: number
}

export interface AuditEvent extends AuditEventInput {
  id: string
  timestamp: Date
}

export interface AuditConfig {
  globalDefaults: {
    retentionDays: number
    logRequestBodies: boolean
    logResponseBodies: boolean
    logUserInput: boolean
    logAgentOutput: boolean
    piiRedaction: boolean
  }
  categoryOverrides: Partial<Record<AuditCategory, {
    retentionDays?: number
    severityMinimum?: AuditSeverity
  }>>
  teamOverrides: Record<string, {
    logUserInput?: boolean
    logAgentOutput?: boolean
    retentionDays?: number
  }>
}
```

**Step 2: Create audit logger**

Create `src/lib/audit/logger.ts`:

```typescript
import { db } from '@/lib/db'
import { auditEvent } from '@/lib/db/schema'
import type { AuditEventInput, AuditEvent, AuditConfig } from './types'

const DEFAULT_CONFIG: AuditConfig = {
  globalDefaults: {
    retentionDays: 90,
    logRequestBodies: false,
    logResponseBodies: false,
    logUserInput: false,
    logAgentOutput: false,
    piiRedaction: true
  },
  categoryOverrides: {
    authentication: { retentionDays: 365 },
    admin_action: { retentionDays: 730 }
  },
  teamOverrides: {}
}

class AuditLogger {
  private config: AuditConfig
  private buffer: AuditEventInput[] = []
  private flushInterval: NodeJS.Timer | null = null

  constructor(config: Partial<AuditConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startFlushInterval()
  }

  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush()
    }, 5000) // Flush every 5 seconds
  }

  async log(event: AuditEventInput): Promise<void> {
    const enrichedEvent = this.enrichEvent(event)
    this.buffer.push(enrichedEvent)

    // Immediate flush for critical events
    if (event.severity === 'critical') {
      await this.flush()
    }
  }

  private enrichEvent(event: AuditEventInput): AuditEventInput {
    const categoryConfig = this.config.categoryOverrides[event.category]
    const teamConfig = event.actor.teamId
      ? this.config.teamOverrides[event.actor.teamId]
      : undefined

    return {
      ...event,
      severity: event.severity || 'info',
      retentionDays:
        teamConfig?.retentionDays ||
        categoryConfig?.retentionDays ||
        this.config.globalDefaults.retentionDays
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const events = [...this.buffer]
    this.buffer = []

    try {
      await db.insert(auditEvent).values(
        events.map(event => ({
          actorType: event.actor.type,
          actorId: event.actor.id,
          actorEmail: event.actor.email,
          actorRole: event.actor.role,
          orgId: event.actor.orgId,
          teamId: event.actor.teamId,
          action: event.action,
          category: event.category,
          severity: event.severity,
          resourceType: event.resource?.type,
          resourceId: event.resource?.id,
          resourceName: event.resource?.name,
          outcome: event.outcome,
          ipAddress: event.actor.ipAddress,
          userAgent: event.actor.userAgent,
          sessionId: event.actor.sessionId,
          detail: event.detail,
          elevated: event.actor.elevated,
          retentionDays: event.retentionDays
        }))
      )
    } catch (error) {
      console.error('Failed to flush audit events:', error)
      // Re-add to buffer for retry
      this.buffer.unshift(...events)
    }
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
  }
}

// Singleton instance
export const auditLogger = new AuditLogger()

// Convenience functions
export async function logAuthEvent(
  action: string,
  actor: AuditEventInput['actor'],
  outcome: AuditEventInput['outcome'],
  detail?: Record<string, unknown>
) {
  await auditLogger.log({
    action,
    category: 'authentication',
    severity: outcome === 'failure' ? 'warning' : 'info',
    actor,
    outcome,
    detail
  })
}

export async function logAgentEvent(
  action: string,
  actor: AuditEventInput['actor'],
  resource: AuditEventInput['resource'],
  outcome: AuditEventInput['outcome'],
  detail?: Record<string, unknown>
) {
  await auditLogger.log({
    action,
    category: 'agent_execution',
    actor,
    resource,
    outcome,
    detail
  })
}

export async function logAdminEvent(
  action: string,
  actor: AuditEventInput['actor'],
  resource: AuditEventInput['resource'],
  outcome: AuditEventInput['outcome'],
  detail?: Record<string, unknown>
) {
  await auditLogger.log({
    action,
    category: 'admin_action',
    severity: 'warning',
    actor,
    resource,
    outcome,
    detail
  })
}
```

**Step 3: Create index export**

Create `src/lib/audit/index.ts`:

```typescript
export * from './types'
export * from './logger'
```

**Step 4: Commit**

```bash
git add src/lib/audit/
git commit -m "feat: add audit logging service with buffered writes"
```

---

### Task 4.2: Create Audit Log Viewer Component

**Files:**

- Create: `src/components/enterprise/admin/AuditLogViewer.tsx`

**Step 1: Create AuditLogViewer component**

Create `src/components/enterprise/admin/AuditLogViewer.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import type { AuditCategory, AuditSeverity } from '@/lib/audit/types'

interface AuditFilters {
  category?: AuditCategory | 'all'
  severity?: AuditSeverity | 'all'
  search?: string
  page: number
  limit: number
}

async function fetchAuditLogs(filters: AuditFilters) {
  const params = new URLSearchParams()
  if (filters.category && filters.category !== 'all') {
    params.set('category', filters.category)
  }
  if (filters.severity && filters.severity !== 'all') {
    params.set('severity', filters.severity)
  }
  if (filters.search) {
    params.set('search', filters.search)
  }
  params.set('page', String(filters.page))
  params.set('limit', String(filters.limit))

  const response = await fetch(`/api/admin/audit-logs?${params}`)
  if (!response.ok) throw new Error('Failed to fetch audit logs')
  return response.json()
}

export function AuditLogViewer() {
  const [filters, setFilters] = useState<AuditFilters>({
    category: 'all',
    severity: 'all',
    search: '',
    page: 1,
    limit: 50
  })

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => fetchAuditLogs(filters)
  })

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive'
      case 'warning': return 'warning'
      default: return 'secondary'
    }
  }

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'denied': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select
          value={filters.category}
          onValueChange={(v) => setFilters({ ...filters, category: v as AuditCategory | 'all', page: 1 })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="authentication">Authentication</SelectItem>
            <SelectItem value="authorization">Authorization</SelectItem>
            <SelectItem value="agent_execution">Agent Execution</SelectItem>
            <SelectItem value="data_access">Data Access</SelectItem>
            <SelectItem value="configuration">Configuration</SelectItem>
            <SelectItem value="membership">Membership</SelectItem>
            <SelectItem value="admin_action">Admin Actions</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.severity}
          onValueChange={(v) => setFilters({ ...filters, severity: v as AuditSeverity | 'all', page: 1 })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Search user, action, resource..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
          className="w-[300px]"
        />

        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.logs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              data?.logs?.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    {formatTimestamp(log.timestamp)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>
                          {log.actorEmail?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{log.actorEmail || log.actorId}</span>
                      {log.elevated && (
                        <Badge variant="warning" className="text-xs">Elevated</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getSeverityVariant(log.severity)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.resourceType && (
                      <span>{log.resourceType}: {log.resourceName || log.resourceId}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getOutcomeIcon(log.outcome)}
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
          {data?.total ? `${data.total} total events` : ''}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={filters.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">Page {filters.page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data?.hasMore}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/enterprise/admin/AuditLogViewer.tsx
git commit -m "feat: add audit log viewer component"
```

---

## Phase 5: Session Management

### Task 5.1: Create Session Privacy Controls

**Files:**

- Create: `src/hooks/useSessions.ts`
- Create: `src/components/enterprise/sessions/SessionList.tsx`
- Create: `src/components/enterprise/sessions/SessionShareDialog.tsx`

**Step 1: Create sessions hook**

Create `src/hooks/useSessions.ts`:

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/providers/AuthProvider'
import { useOrgContext } from '@/components/providers/OrgProvider'

export type SessionFilter = 'mine' | 'shared' | 'team'

interface Session {
  id: string
  name: string | null
  ownerId: string
  ownerEmail: string
  ownerName: string
  orgId: string
  teamId: string | null
  entityType: 'agent' | 'team'
  entityId: string
  entityName: string
  visibility: 'private' | 'team_shared'
  status: string
  messageCount: number
  createdAt: string
  updatedAt: string
  lastMessageAt: string | null
}

async function fetchSessions(filter: SessionFilter, orgId: string, teamId?: string) {
  const params = new URLSearchParams({ filter, orgId })
  if (teamId) params.set('teamId', teamId)

  const response = await fetch(`/api/sessions?${params}`)
  if (!response.ok) throw new Error('Failed to fetch sessions')
  return response.json()
}

async function shareSession(sessionId: string, teamId: string) {
  const response = await fetch(`/api/sessions/${sessionId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ teamId })
  })
  if (!response.ok) throw new Error('Failed to share session')
  return response.json()
}

async function unshareSession(sessionId: string) {
  const response = await fetch(`/api/sessions/${sessionId}/unshare`, {
    method: 'POST'
  })
  if (!response.ok) throw new Error('Failed to unshare session')
  return response.json()
}

export function useSessions() {
  const [filter, setFilter] = useState<SessionFilter>('mine')
  const { user } = useAuth()
  const { activeOrg, activeTeam } = useOrgContext()
  const queryClient = useQueryClient()

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', filter, activeOrg?.id, activeTeam?.id],
    queryFn: () => fetchSessions(filter, activeOrg?.id || '', activeTeam?.id),
    enabled: !!activeOrg?.id
  })

  const shareMutation = useMutation({
    mutationFn: ({ sessionId, teamId }: { sessionId: string; teamId: string }) =>
      shareSession(sessionId, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    }
  })

  const unshareMutation = useMutation({
    mutationFn: (sessionId: string) => unshareSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    }
  })

  const isOwner = (session: Session) => session.ownerId === user?.id

  return {
    sessions,
    filter,
    setFilter,
    isLoading,
    shareSession: shareMutation.mutateAsync,
    unshareSession: unshareMutation.mutateAsync,
    isOwner
  }
}
```

**Step 2: Create SessionList component**

Create `src/components/enterprise/sessions/SessionList.tsx`:

```typescript
'use client'

import { useSessions, SessionFilter } from '@/hooks/useSessions'
import { useUIPermissions } from '@/hooks/useUIPermissions'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Lock, Users, Share, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'

export function SessionList() {
  const { sessions, filter, setFilter, isLoading, isOwner } = useSessions()
  const permissions = useUIPermissions()

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as SessionFilter)}>
        <TabsList>
          <TabsTrigger value="mine">My Sessions</TabsTrigger>
          <TabsTrigger value="shared">Shared with Me</TabsTrigger>
          {permissions.data.showTeamSessions && (
            <TabsTrigger value="team">Team Sessions</TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Session list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No sessions found</div>
        ) : (
          sessions.map((session: any) => (
            <SessionRow
              key={session.id}
              session={session}
              isOwner={isOwner(session)}
              showOwner={filter !== 'mine'}
              canShare={permissions.actions.shareSession}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface SessionRowProps {
  session: any
  isOwner: boolean
  showOwner: boolean
  canShare: boolean
}

function SessionRow({ session, isOwner, showOwner, canShare }: SessionRowProps) {
  const { shareSession, unshareSession } = useSessions()

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        {/* Privacy indicator */}
        {session.visibility === 'private' ? (
          <Lock className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Users className="h-4 w-4 text-blue-500" />
        )}

        <div>
          <p className="font-medium">
            {session.name || 'Untitled Session'}
          </p>
          <p className="text-sm text-muted-foreground">
            {session.entityName} • {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
            {showOwner && ` • ${session.ownerName}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Read-only indicator for non-owners */}
        {!isOwner && (
          <Badge variant="secondary">View Only</Badge>
        )}

        {/* Actions for owners */}
        {isOwner && canShare && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {session.visibility === 'private' ? (
                <DropdownMenuItem onClick={() => shareSession({ sessionId: session.id, teamId: session.teamId })}>
                  <Share className="h-4 w-4 mr-2" />
                  Share with Team
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => unshareSession(session.id)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Make Private
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/hooks/useSessions.ts src/components/enterprise/sessions/
git commit -m "feat: add session management with privacy controls"
```

---

## Phase 6: Docker & Development Environment

### Task 6.1: Update Docker Compose for Enterprise

**Files:**

- Modify: `compose.yaml`
- Create: `dev/postgres/init.sql`
- Create: `dev/keycloak/realm-export.json`

**Step 1: Update compose.yaml**

Replace contents of `compose.yaml`:

```yaml
name: agent-ui-dev

services:
  # Frontend
  agent-ui:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_AGENT_OS_URL=http://agent-os:7777
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET:-dev-secret-change-in-production}
      - DATABASE_URL=postgresql://agent:agent@postgres:5432/agent_ui
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  # Backend (AgentOS)
  agent-os:
    image: agno/agent-os:latest
    ports:
      - "7777:7777"
    environment:
      - DATABASE_URL=postgresql://agent:agent@postgres:5432/agent_os
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - JWT_VERIFICATION_KEY=${JWT_VERIFICATION_KEY:-dev-jwt-key}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  # Identity Provider (Keycloak - Dev)
  keycloak:
    image: quay.io/keycloak/keycloak:26
    command: start-dev --import-realm
    ports:
      - "8080:8080"
    environment:
      - KEYCLOAK_ADMIN=admin
      - KEYCLOAK_ADMIN_PASSWORD=admin
      - KC_HEALTH_ENABLED=true
    volumes:
      - ./dev/keycloak/realm-export.json:/opt/keycloak/data/import/realm.json
    healthcheck:
      test: ["CMD-SHELL", "exec 3<>/dev/tcp/127.0.0.1/8080"]
      interval: 10s
      timeout: 5s
      retries: 10

  # PostgreSQL with pgvector
  postgres:
    image: pgvector/pgvector:pg17
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=agent
      - POSTGRES_PASSWORD=agent
      - POSTGRES_DB=agent_ui
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./dev/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U agent -d agent_ui"]
      interval: 5s
      timeout: 5s
      retries: 10

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  # OpenTelemetry Collector (Dev Observability)
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
    volumes:
      - ./dev/otel/config.yaml:/etc/otelcol/config.yaml
    command: ["--config=/etc/otelcol/config.yaml"]

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: agent-ui
```

**Step 2: Create PostgreSQL init script**

Create `dev/postgres/init.sql`:

```sql
-- Create additional databases
CREATE DATABASE agent_os;

-- Enable extensions
\c agent_ui;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

\c agent_os;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE agent_ui TO agent;
GRANT ALL PRIVILEGES ON DATABASE agent_os TO agent;
```

**Step 3: Create Keycloak realm export**

Create `dev/keycloak/realm-export.json`:

```json
{
  "realm": "agent-ui",
  "enabled": true,
  "sslRequired": "none",
  "registrationAllowed": true,
  "clients": [
    {
      "clientId": "agent-ui-client",
      "enabled": true,
      "publicClient": true,
      "redirectUris": ["http://localhost:3000/*"],
      "webOrigins": ["http://localhost:3000"],
      "standardFlowEnabled": true,
      "directAccessGrantsEnabled": true,
      "protocol": "openid-connect",
      "attributes": {
        "pkce.code.challenge.method": "S256"
      }
    }
  ],
  "roles": {
    "realm": [
      { "name": "user" },
      { "name": "powerUser" },
      { "name": "teamLead" },
      { "name": "teamAdmin" },
      { "name": "orgAdmin" },
      { "name": "globalAdmin" }
    ]
  },
  "users": [
    {
      "username": "admin@example.com",
      "email": "admin@example.com",
      "enabled": true,
      "emailVerified": true,
      "firstName": "Admin",
      "lastName": "User",
      "credentials": [
        {
          "type": "password",
          "value": "admin123",
          "temporary": false
        }
      ],
      "realmRoles": ["globalAdmin"]
    },
    {
      "username": "user@example.com",
      "email": "user@example.com",
      "enabled": true,
      "emailVerified": true,
      "firstName": "Test",
      "lastName": "User",
      "credentials": [
        {
          "type": "password",
          "value": "user123",
          "temporary": false
        }
      ],
      "realmRoles": ["user"]
    }
  ]
}
```

**Step 4: Create OTel collector config**

Create `dev/otel/config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug]
```

**Step 5: Commit**

```bash
git add compose.yaml dev/
git commit -m "feat: update docker compose with enterprise services"
```

---

### Task 6.2: Create Development Dockerfile

**Files:**

- Create: `Dockerfile.dev`

**Step 1: Create development Dockerfile**

Create `Dockerfile.dev`:

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Enable corepack for pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["pnpm", "dev"]
```

**Step 2: Commit**

```bash
git add Dockerfile.dev
git commit -m "feat: add development Dockerfile"
```

---

## Phase 7: Admin Dashboard

### Task 7.1: Create Admin Dashboard Layout

**Files:**

- Create: `src/app/(enterprise)/admin/layout.tsx`
- Create: `src/app/(enterprise)/admin/page.tsx`
- Create: `src/components/enterprise/admin/AdminDashboard.tsx`

**Step 1: Create admin layout**

Create `src/app/(enterprise)/admin/layout.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { hasRole } from '@/lib/permissions'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({
    headers: await headers()
  })

  if (!session) {
    redirect('/login')
  }

  if (!hasRole(session.user.role as any, 'teamAdmin')) {
    redirect('/')
  }

  return <>{children}</>
}
```

**Step 2: Create admin page**

Create `src/app/(enterprise)/admin/page.tsx`:

```typescript
import { AdminDashboard } from '@/components/enterprise/admin/AdminDashboard'

export default function AdminPage() {
  return <AdminDashboard />
}
```

**Step 3: Create AdminDashboard component**

Create `src/components/enterprise/admin/AdminDashboard.tsx`:

```typescript
'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { useUIPermissions } from '@/hooks/useUIPermissions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuditLogViewer } from './AuditLogViewer'
import { PermissionGate } from '@/components/enterprise/common/PermissionGate'

export function AdminDashboard() {
  const { role } = useAuth()
  const permissions = useUIPermissions()

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="text-muted-foreground">
          Manage your organization, teams, and agents
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>

          <PermissionGate permission="member:invite">
            <TabsTrigger value="members">Members</TabsTrigger>
          </PermissionGate>

          <TabsTrigger value="agents">Agents</TabsTrigger>

          <PermissionGate permission="team:manage">
            <TabsTrigger value="usage">Usage</TabsTrigger>
          </PermissionGate>

          <PermissionGate permission="audit:view:bu">
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </PermissionGate>

          <PermissionGate role="globalAdmin">
            <TabsTrigger value="system">System</TabsTrigger>
          </PermissionGate>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <MemberManagement />
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <AgentManagement />
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          <UsageMetrics />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditLogViewer />
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Placeholder components - to be implemented in subsequent tasks
function AdminOverview() {
  return <div className="p-4 border rounded-lg">Admin Overview - Coming soon</div>
}

function MemberManagement() {
  return <div className="p-4 border rounded-lg">Member Management - Coming soon</div>
}

function AgentManagement() {
  return <div className="p-4 border rounded-lg">Agent Management - Coming soon</div>
}

function UsageMetrics() {
  return <div className="p-4 border rounded-lg">Usage Metrics - Coming soon</div>
}

function SystemSettings() {
  return <div className="p-4 border rounded-lg">System Settings - Coming soon</div>
}
```

**Step 4: Commit**

```bash
git add src/app/\(enterprise\)/ src/components/enterprise/admin/AdminDashboard.tsx
git commit -m "feat: add admin dashboard with role-based tabs"
```

---

## Remaining Phases (Summary)

The following phases should be implemented following the same TDD pattern:

### Phase 8: Knowledge Base Management

- Task 8.1: Create knowledge base schema and API
- Task 8.2: Create hierarchical knowledge UI
- Task 8.3: Create document upload component
- Task 8.4: Integrate with AgentOS knowledge endpoints

### Phase 9: Integration System

- Task 9.1: Create webhook management
- Task 9.2: Create Slack/Teams integration
- Task 9.3: Create SIEM export
- Task 9.4: Create plugin system foundation

### Phase 10: SSO Configuration

- Task 10.1: Configure Better Auth SSO plugin
- Task 10.2: Create SAML provider setup UI
- Task 10.3: Create OIDC provider setup UI
- Task 10.4: Implement group-to-role mapping

### Phase 11: Kubernetes Deployment

- Task 11.1: Create Helm chart structure
- Task 11.2: Create deployment manifests
- Task 11.3: Create HPA and PDB
- Task 11.4: Create CI/CD pipeline

### Phase 12: Testing & Documentation

- Task 12.1: Create E2E tests for auth flows
- Task 12.2: Create integration tests for RBAC
- Task 12.3: Create load tests for audit logging
- Task 12.4: Create deployment documentation

---

## Environment Variables Reference

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/agent_ui
BETTER_AUTH_SECRET=your-secret-key-min-32-chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_AGENT_OS_URL=http://localhost:7777

# Optional - Redis
REDIS_URL=redis://localhost:6379

# Optional - SSO
ENTRA_CLIENT_ID=your-azure-client-id
ENTRA_CLIENT_SECRET=your-azure-client-secret
ENTRA_TENANT_ID=your-azure-tenant-id

KEYCLOAK_CLIENT_ID=your-keycloak-client-id
KEYCLOAK_CLIENT_SECRET=your-keycloak-client-secret
KEYCLOAK_ISSUER=http://localhost:8080/realms/agent-ui

# Optional - OpenTelemetry
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# AgentOS
JWT_VERIFICATION_KEY=your-jwt-public-key
OPENAI_API_KEY=your-openai-api-key
```

---

## Quick Start Commands

```bash
# Start development environment
docker compose up -d

# Run database migrations
pnpm db:migrate

# Start development server (if not using Docker)
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```
