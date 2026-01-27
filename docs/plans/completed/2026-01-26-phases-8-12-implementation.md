# Phases 8-12: Enterprise Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement knowledge base management, integrations, SSO configuration, Kubernetes deployment, and comprehensive testing for the enterprise multi-user platform.

**Architecture:** Hybrid knowledge base system where Agent UI owns the KB container abstraction (scoping, permissions, quotas) while Agno handles content storage, processing, and RAG search. Integrations use webhooks with event-driven architecture. SSO leverages Better Auth's SSO plugin with admin UI for provider configuration.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle ORM, Better Auth + SSO plugin, Agno Knowledge API, Playwright for E2E, Helm/Kubernetes, Vitest for unit tests.

---

## Phase 8: Knowledge Base Management

### Task 8.1: Create Knowledge Base API Routes

**Files:**

- Create: `src/app/api/knowledge/route.ts`
- Create: `src/app/api/knowledge/[id]/route.ts`
- Create: `src/app/api/knowledge/[id]/documents/route.ts`
- Create: `src/lib/knowledge/service.ts`
- Create: `src/lib/knowledge/types.ts`

**Step 1: Create types file**

Create `src/lib/knowledge/types.ts`:

```typescript
import { z } from 'zod'

export const ScopeType = z.enum(['organization', 'business_unit', 'team', 'personal'])
export type ScopeType = z.infer<typeof ScopeType>

export const KnowledgeBaseVisibility = z.enum(['private', 'inherited', 'team', 'organization'])
export type KnowledgeBaseVisibility = z.infer<typeof KnowledgeBaseVisibility>

export const CreateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  scopeType: ScopeType,
  teamId: z.string().uuid().optional(),
  visibility: KnowledgeBaseVisibility.default('inherited'),
  config: z.record(z.unknown()).optional()
})

export const UpdateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  visibility: KnowledgeBaseVisibility.optional(),
  config: z.record(z.unknown()).optional()
})

export type CreateKnowledgeBase = z.infer<typeof CreateKnowledgeBaseSchema>
export type UpdateKnowledgeBase = z.infer<typeof UpdateKnowledgeBaseSchema>

export interface KnowledgeBaseWithStats {
  id: string
  name: string
  description: string | null
  scopeType: ScopeType
  orgId: string
  buId: string | null
  teamId: string | null
  userId: string | null
  visibility: string
  config: Record<string, unknown> | null
  documentCount: number
  totalSizeBytes: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface DocumentUploadMetadata {
  kbId: string
  orgId: string
  buId?: string
  teamId?: string
  userId: string
  visibility: string
}
```

**Step 2: Create knowledge service**

Create `src/lib/knowledge/service.ts`:

```typescript
import { db } from '@/lib/db'
import { knowledgeBase, teamQuota } from '@/lib/db/schema'
import { eq, and, or, sql } from 'drizzle-orm'
import type {
  CreateKnowledgeBase,
  UpdateKnowledgeBase,
  KnowledgeBaseWithStats,
  DocumentUploadMetadata
} from './types'

export class KnowledgeService {
  async create(
    data: CreateKnowledgeBase,
    context: { userId: string; orgId: string; buId?: string }
  ): Promise<KnowledgeBaseWithStats> {
    // Check quota
    await this.checkQuota(context.orgId, data.teamId)

    const [kb] = await db
      .insert(knowledgeBase)
      .values({
        name: data.name,
        description: data.description,
        scopeType: data.scopeType,
        orgId: context.orgId,
        buId: context.buId,
        teamId: data.teamId,
        userId: data.scopeType === 'personal' ? context.userId : null,
        visibility: data.visibility,
        config: data.config,
        createdBy: context.userId
      })
      .returning()

    return kb as KnowledgeBaseWithStats
  }

  async list(context: {
    userId: string
    orgId: string
    buId?: string
    teamIds: string[]
    role: string
  }): Promise<KnowledgeBaseWithStats[]> {
    // Build access filter based on user context
    const conditions = [eq(knowledgeBase.orgId, context.orgId)]

    if (context.role !== 'globalAdmin' && context.role !== 'orgAdmin') {
      // Non-admins see: org-level + their BU + their teams + personal
      conditions.push(
        or(
          eq(knowledgeBase.scopeType, 'organization'),
          context.buId ? eq(knowledgeBase.buId, context.buId) : sql`false`,
          context.teamIds.length > 0
            ? sql`${knowledgeBase.teamId} IN (${sql.join(context.teamIds.map(id => sql`${id}`), sql`, `)})`
            : sql`false`,
          and(
            eq(knowledgeBase.scopeType, 'personal'),
            eq(knowledgeBase.userId, context.userId)
          )
        )!
      )
    }

    return db
      .select()
      .from(knowledgeBase)
      .where(and(...conditions)) as Promise<KnowledgeBaseWithStats[]>
  }

  async getById(
    id: string,
    context: { userId: string; orgId: string }
  ): Promise<KnowledgeBaseWithStats | null> {
    const [kb] = await db
      .select()
      .from(knowledgeBase)
      .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.orgId, context.orgId)))

    return (kb as KnowledgeBaseWithStats) || null
  }

  async update(
    id: string,
    data: UpdateKnowledgeBase,
    context: { userId: string; orgId: string }
  ): Promise<KnowledgeBaseWithStats> {
    const [kb] = await db
      .update(knowledgeBase)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.orgId, context.orgId)))
      .returning()

    return kb as KnowledgeBaseWithStats
  }

  async delete(id: string, context: { userId: string; orgId: string }): Promise<void> {
    await db
      .delete(knowledgeBase)
      .where(and(eq(knowledgeBase.id, id), eq(knowledgeBase.orgId, context.orgId)))
  }

  async updateDocumentStats(
    id: string,
    countDelta: number,
    sizeDelta: number
  ): Promise<void> {
    await db
      .update(knowledgeBase)
      .set({
        documentCount: sql`${knowledgeBase.documentCount} + ${countDelta}`,
        totalSizeBytes: sql`${knowledgeBase.totalSizeBytes} + ${sizeDelta}`,
        updatedAt: new Date()
      })
      .where(eq(knowledgeBase.id, id))
  }

  async getUploadMetadata(
    kbId: string,
    context: { userId: string; orgId: string }
  ): Promise<DocumentUploadMetadata | null> {
    const kb = await this.getById(kbId, context)
    if (!kb) return null

    return {
      kbId: kb.id,
      orgId: kb.orgId,
      buId: kb.buId ?? undefined,
      teamId: kb.teamId ?? undefined,
      userId: context.userId,
      visibility: kb.visibility
    }
  }

  private async checkQuota(orgId: string, teamId?: string): Promise<void> {
    if (!teamId) return

    const [quota] = await db
      .select()
      .from(teamQuota)
      .where(eq(teamQuota.teamId, teamId))

    if (!quota) return

    const [stats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.teamId, teamId))

    if (stats.count >= (quota.maxKnowledgeBases ?? 5)) {
      throw new Error('Knowledge base quota exceeded for team')
    }
  }
}

export const knowledgeService = new KnowledgeService()
```

**Step 3: Create list/create API route**

Create `src/app/api/knowledge/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { knowledgeService } from '@/lib/knowledge/service'
import { CreateKnowledgeBaseSchema } from '@/lib/knowledge/types'
import { logAuditEvent } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const context = {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!,
    buId: undefined, // TODO: Get from session
    teamIds: [], // TODO: Get user's team memberships
    role: session.user.role
  }

  const knowledgeBases = await knowledgeService.list(context)
  return NextResponse.json(knowledgeBases)
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = CreateKnowledgeBaseSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const context = {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!,
    buId: undefined
  }

  try {
    const kb = await knowledgeService.create(parsed.data, context)

    await logAuditEvent({
      actorId: session.user.id,
      actorEmail: session.user.email,
      actorRole: session.user.role,
      orgId: context.orgId,
      action: 'knowledge_base.create',
      category: 'knowledge',
      resourceType: 'knowledge_base',
      resourceId: kb.id,
      resourceName: kb.name,
      outcome: 'success'
    })

    return NextResponse.json(kb, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes('quota')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    throw error
  }
}
```

**Step 4: Create single KB API route**

Create `src/app/api/knowledge/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { knowledgeService } from '@/lib/knowledge/service'
import { UpdateKnowledgeBaseSchema } from '@/lib/knowledge/types'
import { logAuditEvent } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const context = {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!
  }

  const kb = await knowledgeService.getById(id, context)
  if (!kb) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(kb)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = UpdateKnowledgeBaseSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const context = {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!
  }

  const kb = await knowledgeService.update(id, parsed.data, context)

  await logAuditEvent({
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorRole: session.user.role,
    orgId: context.orgId,
    action: 'knowledge_base.update',
    category: 'knowledge',
    resourceType: 'knowledge_base',
    resourceId: kb.id,
    resourceName: kb.name,
    outcome: 'success'
  })

  return NextResponse.json(kb)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const context = {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!
  }

  const kb = await knowledgeService.getById(id, context)
  if (!kb) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // TODO: Delete documents from Agno first
  await knowledgeService.delete(id, context)

  await logAuditEvent({
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorRole: session.user.role,
    orgId: context.orgId,
    action: 'knowledge_base.delete',
    category: 'knowledge',
    resourceType: 'knowledge_base',
    resourceId: id,
    resourceName: kb.name,
    outcome: 'success'
  })

  return new NextResponse(null, { status: 204 })
}
```

**Step 5: Commit**

```bash
git add src/lib/knowledge/ src/app/api/knowledge/
git commit -m "feat(knowledge): add knowledge base API routes and service"
```

---

### Task 8.2: Create AgentOS Knowledge Integration

**Files:**

- Create: `src/lib/knowledge/agentosClient.ts`
- Create: `src/app/api/knowledge/[id]/documents/route.ts`
- Modify: `src/api/routes.ts`

**Step 1: Add Knowledge routes to routes.ts**

Modify `src/api/routes.ts` to add:

```typescript
export const APIRoutes = {
  // ... existing routes ...

  // Knowledge API
  KnowledgeUpload: (agentOSUrl: string) => `${agentOSUrl}/knowledge/content`,
  KnowledgeSearch: (agentOSUrl: string) => `${agentOSUrl}/knowledge/search`,
  KnowledgeContent: (agentOSUrl: string, contentId: string) =>
    `${agentOSUrl}/knowledge/content/${contentId}`,
  KnowledgeContentStatus: (agentOSUrl: string, contentId: string) =>
    `${agentOSUrl}/knowledge/content/${contentId}/status`,
  KnowledgeConfig: (agentOSUrl: string) => `${agentOSUrl}/knowledge/config`
}
```

**Step 2: Create AgentOS knowledge client**

Create `src/lib/knowledge/agentosClient.ts`:

```typescript
import { APIRoutes } from '@/api/routes'
import type { DocumentUploadMetadata } from './types'

export interface AgentOSKnowledgeConfig {
  endpoint: string
  authToken?: string
}

export interface ContentUploadResponse {
  id: string
  name: string
  status: string
  size: number
}

export interface ContentSearchResult {
  id: string
  content: string
  name: string
  meta_data: Record<string, unknown>
  score: number
}

export class AgentOSKnowledgeClient {
  private endpoint: string
  private authToken?: string

  constructor(config: AgentOSKnowledgeConfig) {
    this.endpoint = config.endpoint
    this.authToken = config.authToken
  }

  private headers(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }
    return headers
  }

  async uploadDocument(
    file: File,
    metadata: DocumentUploadMetadata,
    options?: { name?: string; description?: string }
  ): Promise<ContentUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', options?.name ?? file.name)
    if (options?.description) {
      formData.append('description', options.description)
    }
    // Include scoping metadata for filtering
    formData.append(
      'metadata',
      JSON.stringify({
        kb_id: metadata.kbId,
        org_id: metadata.orgId,
        bu_id: metadata.buId,
        team_id: metadata.teamId,
        user_id: metadata.userId,
        visibility: metadata.visibility
      })
    )

    const response = await fetch(APIRoutes.KnowledgeUpload(this.endpoint), {
      method: 'POST',
      headers: this.authToken
        ? { Authorization: `Bearer ${this.authToken}` }
        : undefined,
      body: formData
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Upload failed: ${error}`)
    }

    return response.json()
  }

  async searchKnowledge(
    query: string,
    filters: Record<string, unknown>,
    options?: { maxResults?: number; searchType?: 'vector' | 'keyword' | 'hybrid' }
  ): Promise<ContentSearchResult[]> {
    const response = await fetch(APIRoutes.KnowledgeSearch(this.endpoint), {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        query,
        filters,
        max_results: options?.maxResults ?? 10,
        search_type: options?.searchType ?? 'hybrid'
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Search failed: ${error}`)
    }

    const result = await response.json()
    return result.data
  }

  async deleteContent(contentId: string): Promise<void> {
    const response = await fetch(
      APIRoutes.KnowledgeContent(this.endpoint, contentId),
      {
        method: 'DELETE',
        headers: this.headers()
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Delete failed: ${error}`)
    }
  }

  async deleteByFilter(filters: Record<string, unknown>): Promise<number> {
    // List content matching filter, then delete each
    // AgentOS doesn't have bulk delete by filter, so we iterate
    const response = await fetch(
      `${APIRoutes.KnowledgeUpload(this.endpoint)}?${new URLSearchParams({
        filters: JSON.stringify(filters)
      })}`,
      {
        method: 'GET',
        headers: this.headers()
      }
    )

    if (!response.ok) {
      throw new Error('Failed to list content for deletion')
    }

    const { data } = await response.json()
    let deleted = 0

    for (const content of data) {
      await this.deleteContent(content.id)
      deleted++
    }

    return deleted
  }

  async getContentStatus(contentId: string): Promise<{ status: string; message?: string }> {
    const response = await fetch(
      APIRoutes.KnowledgeContentStatus(this.endpoint, contentId),
      {
        method: 'GET',
        headers: this.headers()
      }
    )

    if (!response.ok) {
      throw new Error('Failed to get content status')
    }

    return response.json()
  }
}

export function createKnowledgeClient(
  endpoint: string,
  authToken?: string
): AgentOSKnowledgeClient {
  return new AgentOSKnowledgeClient({ endpoint, authToken })
}
```

**Step 3: Create documents upload route**

Create `src/app/api/knowledge/[id]/documents/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { knowledgeService } from '@/lib/knowledge/service'
import { createKnowledgeClient } from '@/lib/knowledge/agentosClient'
import { logAuditEvent } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const context = {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!
  }

  // Get KB and verify access
  const kb = await knowledgeService.getById(id, context)
  if (!kb) {
    return NextResponse.json({ error: 'Knowledge base not found' }, { status: 404 })
  }

  // Get upload metadata for scoping
  const metadata = await knowledgeService.getUploadMetadata(id, context)
  if (!metadata) {
    return NextResponse.json({ error: 'Failed to get upload metadata' }, { status: 500 })
  }

  // Parse multipart form data
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const name = formData.get('name') as string | null
  const description = formData.get('description') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Get AgentOS endpoint from env or request
  const agentOSUrl = process.env.NEXT_PUBLIC_AGENT_OS_URL ?? 'http://localhost:7777'
  const client = createKnowledgeClient(agentOSUrl, session.session.token)

  try {
    // Upload to AgentOS
    const result = await client.uploadDocument(file, metadata, {
      name: name ?? undefined,
      description: description ?? undefined
    })

    // Update KB stats
    await knowledgeService.updateDocumentStats(id, 1, file.size)

    await logAuditEvent({
      actorId: session.user.id,
      actorEmail: session.user.email,
      actorRole: session.user.role,
      orgId: context.orgId,
      action: 'knowledge_base.document.upload',
      category: 'knowledge',
      resourceType: 'document',
      resourceId: result.id,
      resourceName: file.name,
      outcome: 'success',
      detail: { kbId: id, size: file.size }
    })

    return NextResponse.json(result, { status: 202 })
  } catch (error) {
    await logAuditEvent({
      actorId: session.user.id,
      actorEmail: session.user.email,
      actorRole: session.user.role,
      orgId: context.orgId,
      action: 'knowledge_base.document.upload',
      category: 'knowledge',
      resourceType: 'document',
      resourceName: file.name,
      outcome: 'failure',
      detail: { kbId: id, error: String(error) }
    })

    return NextResponse.json(
      { error: 'Upload failed', details: String(error) },
      { status: 500 }
    )
  }
}
```

**Step 4: Commit**

```bash
git add src/lib/knowledge/agentosClient.ts src/app/api/knowledge/[id]/documents/ src/api/routes.ts
git commit -m "feat(knowledge): add AgentOS knowledge client and document upload"
```

---

### Task 8.3: Create Knowledge Base UI Components

**Files:**

- Create: `src/components/knowledge/KnowledgeBaseList.tsx`
- Create: `src/components/knowledge/KnowledgeBaseCard.tsx`
- Create: `src/components/knowledge/CreateKnowledgeBaseDialog.tsx`
- Create: `src/components/knowledge/DocumentUpload.tsx`
- Create: `src/hooks/useKnowledgeBases.ts`

**Step 1: Create useKnowledgeBases hook**

Create `src/hooks/useKnowledgeBases.ts`:

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { KnowledgeBaseWithStats, CreateKnowledgeBase } from '@/lib/knowledge/types'

async function fetchKnowledgeBases(): Promise<KnowledgeBaseWithStats[]> {
  const response = await fetch('/api/knowledge')
  if (!response.ok) throw new Error('Failed to fetch knowledge bases')
  return response.json()
}

async function createKnowledgeBase(data: CreateKnowledgeBase): Promise<KnowledgeBaseWithStats> {
  const response = await fetch('/api/knowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create knowledge base')
  }
  return response.json()
}

async function deleteKnowledgeBase(id: string): Promise<void> {
  const response = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Failed to delete knowledge base')
}

async function uploadDocument(kbId: string, file: File): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`/api/knowledge/${kbId}/documents`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to upload document')
  }
}

export function useKnowledgeBases() {
  return useQuery({
    queryKey: ['knowledgeBases'],
    queryFn: fetchKnowledgeBases
  })
}

export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createKnowledgeBase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] })
    }
  })
}

export function useDeleteKnowledgeBase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteKnowledgeBase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] })
    }
  })
}

export function useUploadDocument(kbId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => uploadDocument(kbId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeBases'] })
    }
  })
}
```

**Step 2: Create KnowledgeBaseCard component**

Create `src/components/knowledge/KnowledgeBaseCard.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Trash2, Upload, FileText, Database } from 'lucide-react'
import type { KnowledgeBaseWithStats } from '@/lib/knowledge/types'
import { DocumentUpload } from './DocumentUpload'

interface KnowledgeBaseCardProps {
  kb: KnowledgeBaseWithStats
  onDelete: (id: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function KnowledgeBaseCard({ kb, onDelete }: KnowledgeBaseCardProps) {
  const [showUpload, setShowUpload] = useState(false)

  const scopeColors: Record<string, string> = {
    organization: 'bg-purple-100 text-purple-800',
    business_unit: 'bg-blue-100 text-blue-800',
    team: 'bg-green-100 text-green-800',
    personal: 'bg-gray-100 text-gray-800'
  }

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">{kb.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={scopeColors[kb.scopeType]}>{kb.scopeType}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowUpload(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onDelete(kb.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {kb.description && (
            <p className="text-sm text-muted-foreground mb-4">{kb.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {kb.documentCount} documents
            </div>
            <div className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              {formatBytes(kb.totalSizeBytes)}
            </div>
          </div>
        </CardContent>
      </Card>

      <DocumentUpload
        kbId={kb.id}
        kbName={kb.name}
        open={showUpload}
        onOpenChange={setShowUpload}
      />
    </>
  )
}
```

**Step 3: Create DocumentUpload component**

Create `src/components/knowledge/DocumentUpload.tsx`:

```typescript
'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { useUploadDocument } from '@/hooks/useKnowledgeBases'
import { toast } from 'sonner'

interface DocumentUploadProps {
  kbId: string
  kbName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentUpload({ kbId, kbName, open, onOpenChange }: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [dragActive, setDragActive] = useState(false)
  const uploadMutation = useUploadDocument(kbId)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...droppedFiles])
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...selectedFiles])
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleUpload = async () => {
    for (const file of files) {
      try {
        await uploadMutation.mutateAsync(file)
        toast.success(`Uploaded ${file.name}`)
      } catch (error) {
        toast.error(`Failed to upload ${file.name}: ${error}`)
      }
    }
    setFiles([])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload to {kbName}</DialogTitle>
        </DialogHeader>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop files here, or click to select
          </p>
          <input
            type="file"
            multiple
            className="hidden"
            id="file-upload"
            onChange={handleFileSelect}
            accept=".pdf,.txt,.md,.docx,.csv,.json"
          />
          <label htmlFor="file-upload">
            <Button variant="outline" asChild>
              <span>Select Files</span>
            </Button>
          </label>
          <p className="text-xs text-muted-foreground mt-2">
            Supported: PDF, TXT, MD, DOCX, CSV, JSON
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between p-2 bg-muted rounded"
              >
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4" />
                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploadMutation.isPending}
          >
            {uploadMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Upload {files.length > 0 && `(${files.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 4: Create CreateKnowledgeBaseDialog**

Create `src/components/knowledge/CreateKnowledgeBaseDialog.tsx`:

```typescript
'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { useCreateKnowledgeBase } from '@/hooks/useKnowledgeBases'
import { toast } from 'sonner'
import type { ScopeType } from '@/lib/knowledge/types'

export function CreateKnowledgeBaseDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [scopeType, setScopeType] = useState<ScopeType>('team')

  const createMutation = useCreateKnowledgeBase()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createMutation.mutateAsync({
        name,
        description: description || undefined,
        scopeType
      })
      toast.success('Knowledge base created')
      setOpen(false)
      setName('')
      setDescription('')
      setScopeType('team')
    } catch (error) {
      toast.error(`Failed to create: ${error}`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Knowledge Base
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Knowledge Base</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Product Documentation"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of documents will this contain?"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scope">Scope</Label>
            <Select value={scopeType} onValueChange={(v) => setScopeType(v as ScopeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal (only you)</SelectItem>
                <SelectItem value="team">Team (your team members)</SelectItem>
                <SelectItem value="business_unit">Business Unit</SelectItem>
                <SelectItem value="organization">Organization (everyone)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 5: Create KnowledgeBaseList component**

Create `src/components/knowledge/KnowledgeBaseList.tsx`:

```typescript
'use client'

import { useKnowledgeBases, useDeleteKnowledgeBase } from '@/hooks/useKnowledgeBases'
import { KnowledgeBaseCard } from './KnowledgeBaseCard'
import { CreateKnowledgeBaseDialog } from './CreateKnowledgeBaseDialog'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export function KnowledgeBaseList() {
  const { data: knowledgeBases, isLoading, error } = useKnowledgeBases()
  const deleteMutation = useDeleteKnowledgeBase()

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge base?')) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Knowledge base deleted')
    } catch (error) {
      toast.error(`Failed to delete: ${error}`)
    }
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to load knowledge bases: {String(error)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Knowledge Bases</h2>
          <p className="text-muted-foreground">
            Manage your team&apos;s knowledge bases and documents
          </p>
        </div>
        <CreateKnowledgeBaseDialog />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[180px]" />
          ))}
        </div>
      ) : knowledgeBases?.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <p className="text-muted-foreground mb-4">No knowledge bases yet</p>
          <CreateKnowledgeBaseDialog />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {knowledgeBases?.map((kb) => (
            <KnowledgeBaseCard key={kb.id} kb={kb} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add src/components/knowledge/ src/hooks/useKnowledgeBases.ts
git commit -m "feat(knowledge): add knowledge base UI components"
```

---

### Task 8.4: Create Knowledge Page

**Files:**

- Create: `src/app/(enterprise)/knowledge/page.tsx`
- Create: `src/app/(enterprise)/knowledge/layout.tsx`

**Step 1: Create knowledge layout**

Create `src/app/(enterprise)/knowledge/layout.tsx`:

```typescript
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Knowledge Bases - Agent UI',
  description: 'Manage your team knowledge bases'
}

export default function KnowledgeLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
```

**Step 2: Create knowledge page**

Create `src/app/(enterprise)/knowledge/page.tsx`:

```typescript
import { KnowledgeBaseList } from '@/components/knowledge/KnowledgeBaseList'

export default function KnowledgePage() {
  return (
    <div className="container mx-auto py-6">
      <KnowledgeBaseList />
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/app/\(enterprise\)/knowledge/
git commit -m "feat(knowledge): add knowledge base page"
```

---

## Phase 9: Integration System

### Task 9.1: Create Webhook Management API

**Files:**

- Create: `src/lib/webhooks/types.ts`
- Create: `src/lib/webhooks/service.ts`
- Create: `src/app/api/webhooks/route.ts`
- Create: `src/app/api/webhooks/[id]/route.ts`
- Create: `src/lib/webhooks/dispatcher.ts`

**Step 1: Create webhook types**

Create `src/lib/webhooks/types.ts`:

```typescript
import { z } from 'zod'

export const WebhookEventType = z.enum([
  'session.created',
  'session.completed',
  'session.shared',
  'agent.run.started',
  'agent.run.completed',
  'agent.run.failed',
  'knowledge.document.uploaded',
  'knowledge.document.deleted',
  'member.invited',
  'member.removed',
  'audit.high_severity'
])
export type WebhookEventType = z.infer<typeof WebhookEventType>

export const WebhookAuthType = z.enum(['none', 'bearer', 'basic', 'hmac'])
export type WebhookAuthType = z.infer<typeof WebhookAuthType>

export const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(255),
  scopeType: z.enum(['organization', 'business_unit', 'team']),
  scopeId: z.string(),
  url: z.string().url(),
  method: z.enum(['POST', 'PUT']).default('POST'),
  headers: z.record(z.string()).optional(),
  authType: WebhookAuthType.default('none'),
  authToken: z.string().optional(),
  events: z.array(WebhookEventType).min(1),
  filters: z.record(z.unknown()).optional()
})

export const UpdateWebhookSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
  authType: WebhookAuthType.optional(),
  authToken: z.string().optional(),
  events: z.array(WebhookEventType).min(1).optional(),
  filters: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional()
})

export type CreateWebhook = z.infer<typeof CreateWebhookSchema>
export type UpdateWebhook = z.infer<typeof UpdateWebhookSchema>

export interface WebhookEndpoint {
  id: string
  name: string
  scopeType: string
  scopeId: string
  url: string
  method: string
  headers: Record<string, string> | null
  authType: string
  events: WebhookEventType[]
  filters: Record<string, unknown> | null
  enabled: boolean
  lastTriggeredAt: Date | null
  failureCount: number
  createdBy: string
  createdAt: Date
}

export interface WebhookPayload {
  event: WebhookEventType
  timestamp: string
  data: Record<string, unknown>
  metadata: {
    orgId: string
    teamId?: string
    userId?: string
  }
}
```

**Step 2: Create webhook service**

Create `src/lib/webhooks/service.ts`:

```typescript
import { db } from '@/lib/db'
import { webhookEndpoint } from '@/lib/db/schema'
import { eq, and, or, sql } from 'drizzle-orm'
import type { CreateWebhook, UpdateWebhook, WebhookEndpoint } from './types'

export class WebhookService {
  async create(
    data: CreateWebhook,
    context: { userId: string; orgId: string }
  ): Promise<WebhookEndpoint> {
    const [webhook] = await db
      .insert(webhookEndpoint)
      .values({
        name: data.name,
        scopeType: data.scopeType,
        scopeId: data.scopeId,
        url: data.url,
        method: data.method,
        headers: data.headers,
        authType: data.authType,
        authToken: data.authToken, // TODO: Encrypt before storing
        events: data.events,
        filters: data.filters,
        createdBy: context.userId
      })
      .returning()

    return webhook as WebhookEndpoint
  }

  async list(context: {
    orgId: string
    teamIds: string[]
    buId?: string
  }): Promise<WebhookEndpoint[]> {
    const conditions = []

    // Org-level webhooks
    conditions.push(
      and(
        eq(webhookEndpoint.scopeType, 'organization'),
        eq(webhookEndpoint.scopeId, context.orgId)
      )
    )

    // BU-level webhooks
    if (context.buId) {
      conditions.push(
        and(
          eq(webhookEndpoint.scopeType, 'business_unit'),
          eq(webhookEndpoint.scopeId, context.buId)
        )
      )
    }

    // Team-level webhooks
    if (context.teamIds.length > 0) {
      conditions.push(
        and(
          eq(webhookEndpoint.scopeType, 'team'),
          sql`${webhookEndpoint.scopeId} IN (${sql.join(context.teamIds.map(id => sql`${id}`), sql`, `)})`
        )
      )
    }

    return db
      .select()
      .from(webhookEndpoint)
      .where(or(...conditions)) as Promise<WebhookEndpoint[]>
  }

  async getById(id: string): Promise<WebhookEndpoint | null> {
    const [webhook] = await db
      .select()
      .from(webhookEndpoint)
      .where(eq(webhookEndpoint.id, id))

    return (webhook as WebhookEndpoint) || null
  }

  async update(id: string, data: UpdateWebhook): Promise<WebhookEndpoint> {
    const [webhook] = await db
      .update(webhookEndpoint)
      .set(data)
      .where(eq(webhookEndpoint.id, id))
      .returning()

    return webhook as WebhookEndpoint
  }

  async delete(id: string): Promise<void> {
    await db.delete(webhookEndpoint).where(eq(webhookEndpoint.id, id))
  }

  async getByEvent(
    event: string,
    context: { orgId: string; teamId?: string; buId?: string }
  ): Promise<WebhookEndpoint[]> {
    const webhooks = await this.list({
      orgId: context.orgId,
      teamIds: context.teamId ? [context.teamId] : [],
      buId: context.buId
    })

    return webhooks.filter(
      (w) => w.enabled && w.events.includes(event as any)
    )
  }

  async recordTrigger(id: string, success: boolean): Promise<void> {
    if (success) {
      await db
        .update(webhookEndpoint)
        .set({
          lastTriggeredAt: new Date(),
          failureCount: 0
        })
        .where(eq(webhookEndpoint.id, id))
    } else {
      await db
        .update(webhookEndpoint)
        .set({
          failureCount: sql`${webhookEndpoint.failureCount} + 1`
        })
        .where(eq(webhookEndpoint.id, id))
    }
  }
}

export const webhookService = new WebhookService()
```

**Step 3: Create webhook dispatcher**

Create `src/lib/webhooks/dispatcher.ts`:

```typescript
import { webhookService } from './service'
import type { WebhookEventType, WebhookPayload, WebhookEndpoint } from './types'

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 5000, 15000] // ms

export async function dispatchWebhookEvent(
  event: WebhookEventType,
  data: Record<string, unknown>,
  context: { orgId: string; teamId?: string; buId?: string; userId?: string }
): Promise<void> {
  const webhooks = await webhookService.getByEvent(event, context)

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
    metadata: {
      orgId: context.orgId,
      teamId: context.teamId,
      userId: context.userId
    }
  }

  // Dispatch to all matching webhooks (non-blocking)
  for (const webhook of webhooks) {
    // Check filters
    if (webhook.filters && !matchesFilters(data, webhook.filters)) {
      continue
    }

    // Fire and forget with retry
    deliverWebhook(webhook, payload).catch(console.error)
  }
}

async function deliverWebhook(
  webhook: WebhookEndpoint,
  payload: WebhookPayload,
  attempt = 0
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Event': payload.event,
    'X-Webhook-Timestamp': payload.timestamp,
    ...(webhook.headers || {})
  }

  // Add authentication
  if (webhook.authType === 'bearer' && webhook.authToken) {
    headers['Authorization'] = `Bearer ${webhook.authToken}`
  } else if (webhook.authType === 'basic' && webhook.authToken) {
    headers['Authorization'] = `Basic ${webhook.authToken}`
  } else if (webhook.authType === 'hmac' && webhook.authToken) {
    const signature = await computeHmacSignature(
      JSON.stringify(payload),
      webhook.authToken
    )
    headers['X-Webhook-Signature'] = signature
  }

  try {
    const response = await fetch(webhook.url, {
      method: webhook.method,
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000) // 10s timeout
    })

    if (response.ok) {
      await webhookService.recordTrigger(webhook.id, true)
    } else {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }
  } catch (error) {
    console.error(`Webhook delivery failed for ${webhook.id}:`, error)

    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]))
      return deliverWebhook(webhook, payload, attempt + 1)
    }

    await webhookService.recordTrigger(webhook.id, false)
  }
}

function matchesFilters(
  data: Record<string, unknown>,
  filters: Record<string, unknown>
): boolean {
  for (const [key, value] of Object.entries(filters)) {
    const dataValue = getNestedValue(data, key)
    if (Array.isArray(value)) {
      if (!value.includes(dataValue)) return false
    } else if (dataValue !== value) {
      return false
    }
  }
  return true
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: any, part) => acc?.[part], obj)
}

async function computeHmacSignature(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
```

**Step 4: Create webhook API route**

Create `src/app/api/webhooks/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { webhookService } from '@/lib/webhooks/service'
import { CreateWebhookSchema } from '@/lib/webhooks/types'
import { logAuditEvent } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const webhooks = await webhookService.list({
    orgId: session.session.activeOrganizationId!,
    teamIds: [], // TODO: Get user's team memberships
    buId: undefined
  })

  return NextResponse.json(webhooks)
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = CreateWebhookSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const webhook = await webhookService.create(parsed.data, {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!
  })

  await logAuditEvent({
    actorId: session.user.id,
    actorEmail: session.user.email,
    actorRole: session.user.role,
    orgId: session.session.activeOrganizationId!,
    action: 'webhook.create',
    category: 'integration',
    resourceType: 'webhook',
    resourceId: webhook.id,
    resourceName: webhook.name,
    outcome: 'success'
  })

  return NextResponse.json(webhook, { status: 201 })
}
```

**Step 5: Commit**

```bash
git add src/lib/webhooks/ src/app/api/webhooks/
git commit -m "feat(webhooks): add webhook management API and dispatcher"
```

---

### Task 9.2: Create Slack/Teams Integration

**Files:**

- Create: `src/lib/integrations/slack.ts`
- Create: `src/lib/integrations/teams.ts`
- Create: `src/app/api/integrations/slack/route.ts`

**Step 1: Create Slack integration**

Create `src/lib/integrations/slack.ts`:

```typescript
export interface SlackMessage {
  channel: string
  text: string
  blocks?: SlackBlock[]
  attachments?: SlackAttachment[]
}

export interface SlackBlock {
  type: string
  text?: { type: string; text: string }
  elements?: unknown[]
}

export interface SlackAttachment {
  color?: string
  title?: string
  text?: string
  fields?: { title: string; value: string; short?: boolean }[]
}

export class SlackClient {
  private webhookUrl: string

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }

  async sendMessage(message: SlackMessage): Promise<boolean> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })

      return response.ok
    } catch (error) {
      console.error('Slack message failed:', error)
      return false
    }
  }

  static formatAgentRunNotification(data: {
    agentName: string
    sessionId: string
    status: 'completed' | 'failed'
    duration?: number
    summary?: string
    error?: string
  }): SlackMessage {
    const isSuccess = data.status === 'completed'

    return {
      channel: '#agent-notifications',
      text: `Agent run ${data.status}: ${data.agentName}`,
      attachments: [
        {
          color: isSuccess ? '#36a64f' : '#ff0000',
          title: `${data.agentName} - ${data.status.toUpperCase()}`,
          fields: [
            { title: 'Session ID', value: data.sessionId, short: true },
            ...(data.duration
              ? [{ title: 'Duration', value: `${data.duration}ms`, short: true }]
              : []),
            ...(data.summary
              ? [{ title: 'Summary', value: data.summary }]
              : []),
            ...(data.error
              ? [{ title: 'Error', value: data.error }]
              : [])
          ]
        }
      ]
    }
  }

  static formatAuditAlert(data: {
    action: string
    actorEmail: string
    resourceType: string
    resourceName: string
    severity: string
  }): SlackMessage {
    return {
      channel: '#security-alerts',
      text: `Security Alert: ${data.action}`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `🚨 ${data.severity.toUpperCase()} Security Alert` }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Action:* ${data.action}\n*Actor:* ${data.actorEmail}\n*Resource:* ${data.resourceType}/${data.resourceName}`
          }
        }
      ]
    }
  }
}
```

**Step 2: Create Teams integration**

Create `src/lib/integrations/teams.ts`:

```typescript
export interface TeamsMessage {
  '@type': 'MessageCard'
  '@context': string
  summary: string
  themeColor: string
  title: string
  sections: TeamsSection[]
  potentialAction?: TeamsAction[]
}

export interface TeamsSection {
  activityTitle?: string
  activitySubtitle?: string
  facts?: { name: string; value: string }[]
  text?: string
}

export interface TeamsAction {
  '@type': string
  name: string
  targets?: { os: string; uri: string }[]
}

export class TeamsClient {
  private webhookUrl: string

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl
  }

  async sendMessage(message: TeamsMessage): Promise<boolean> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      })

      return response.ok
    } catch (error) {
      console.error('Teams message failed:', error)
      return false
    }
  }

  static formatAgentRunNotification(data: {
    agentName: string
    sessionId: string
    status: 'completed' | 'failed'
    duration?: number
    summary?: string
    error?: string
  }): TeamsMessage {
    const isSuccess = data.status === 'completed'

    return {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: `Agent run ${data.status}: ${data.agentName}`,
      themeColor: isSuccess ? '36a64f' : 'ff0000',
      title: `${data.agentName} - ${data.status.toUpperCase()}`,
      sections: [
        {
          facts: [
            { name: 'Session ID', value: data.sessionId },
            ...(data.duration
              ? [{ name: 'Duration', value: `${data.duration}ms` }]
              : []),
            ...(data.summary ? [{ name: 'Summary', value: data.summary }] : []),
            ...(data.error ? [{ name: 'Error', value: data.error }] : [])
          ]
        }
      ]
    }
  }
}
```

**Step 3: Create Slack API route**

Create `src/app/api/integrations/slack/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { SlackClient } from '@/lib/integrations/slack'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { webhookUrl, testMessage } = await request.json()

  if (!webhookUrl) {
    return NextResponse.json({ error: 'Webhook URL required' }, { status: 400 })
  }

  const client = new SlackClient(webhookUrl)

  const success = await client.sendMessage({
    channel: '#test',
    text: testMessage || 'Test message from Agent UI'
  })

  if (success) {
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
}
```

**Step 4: Commit**

```bash
git add src/lib/integrations/ src/app/api/integrations/
git commit -m "feat(integrations): add Slack and Teams integration clients"
```

---

### Task 9.3: Create SIEM Export

**Files:**

- Create: `src/lib/audit/siemExporter.ts`
- Create: `src/app/api/audit/export/route.ts`

**Step 1: Create SIEM exporter**

Create `src/lib/audit/siemExporter.ts`:

```typescript
import { db } from '@/lib/db'
import { auditEvent } from '@/lib/db/schema'
import { and, gte, lte, eq } from 'drizzle-orm'

export interface SIEMEvent {
  timestamp: string
  source: string
  eventType: string
  severity: string
  actor: {
    id: string
    email: string
    role: string
  }
  resource: {
    type: string
    id: string
    name: string
  }
  action: string
  outcome: string
  organization: string
  team?: string
  details: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export type SIEMFormat = 'json' | 'cef' | 'leef'

export class SIEMExporter {
  async exportEvents(
    orgId: string,
    options: {
      startDate: Date
      endDate: Date
      format: SIEMFormat
      categories?: string[]
      severities?: string[]
    }
  ): Promise<string> {
    const conditions = [
      eq(auditEvent.orgId, orgId),
      gte(auditEvent.timestamp, options.startDate),
      lte(auditEvent.timestamp, options.endDate)
    ]

    const events = await db
      .select()
      .from(auditEvent)
      .where(and(...conditions))
      .orderBy(auditEvent.timestamp)

    const siemEvents: SIEMEvent[] = events.map((e) => ({
      timestamp: e.timestamp.toISOString(),
      source: 'agent-ui',
      eventType: e.action,
      severity: e.severity,
      actor: {
        id: e.actorId,
        email: e.actorEmail || '',
        role: e.actorRole || ''
      },
      resource: {
        type: e.resourceType || '',
        id: e.resourceId || '',
        name: e.resourceName || ''
      },
      action: e.action,
      outcome: e.outcome,
      organization: e.orgId,
      team: e.teamId || undefined,
      details: (e.detail as Record<string, unknown>) || {},
      ipAddress: e.ipAddress || undefined,
      userAgent: e.userAgent || undefined
    }))

    switch (options.format) {
      case 'cef':
        return this.formatCEF(siemEvents)
      case 'leef':
        return this.formatLEEF(siemEvents)
      default:
        return JSON.stringify(siemEvents, null, 2)
    }
  }

  private formatCEF(events: SIEMEvent[]): string {
    return events
      .map((e) => {
        const severity = this.severityToNumber(e.severity)
        const extension = [
          `act=${e.action}`,
          `outcome=${e.outcome}`,
          `suser=${e.actor.email}`,
          `dvc=${e.ipAddress || 'unknown'}`,
          `cs1=${e.organization}`,
          `cs1Label=Organization`
        ].join(' ')

        return `CEF:0|AgentUI|AgentUI|1.0|${e.eventType}|${e.eventType}|${severity}|${extension}`
      })
      .join('\n')
  }

  private formatLEEF(events: SIEMEvent[]): string {
    return events
      .map((e) => {
        const attributes = [
          `devTime=${e.timestamp}`,
          `usrName=${e.actor.email}`,
          `action=${e.action}`,
          `outcome=${e.outcome}`,
          `src=${e.ipAddress || 'unknown'}`
        ].join('\t')

        return `LEEF:1.0|AgentUI|AgentUI|1.0|${e.eventType}|${attributes}`
      })
      .join('\n')
  }

  private severityToNumber(severity: string): number {
    const map: Record<string, number> = {
      low: 3,
      info: 3,
      medium: 5,
      high: 7,
      critical: 10
    }
    return map[severity.toLowerCase()] || 5
  }
}

export const siemExporter = new SIEMExporter()
```

**Step 2: Create export API route**

Create `src/app/api/audit/export/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { siemExporter, SIEMFormat } from '@/lib/audit/siemExporter'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check permission
  if (!['orgAdmin', 'globalAdmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const searchParams = request.nextUrl.searchParams
  const format = (searchParams.get('format') || 'json') as SIEMFormat
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate and endDate required' },
      { status: 400 }
    )
  }

  const data = await siemExporter.exportEvents(
    session.session.activeOrganizationId!,
    {
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      format
    }
  )

  const contentType = format === 'json' ? 'application/json' : 'text/plain'
  const filename = `audit-export-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'txt'}`

  return new NextResponse(data, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`
    }
  })
}
```

**Step 3: Commit**

```bash
git add src/lib/audit/siemExporter.ts src/app/api/audit/export/
git commit -m "feat(audit): add SIEM export in JSON, CEF, and LEEF formats"
```

---

## Phase 10: SSO Configuration

### Task 10.1: Configure Better Auth SSO Plugin

**Files:**

- Modify: `src/lib/auth.ts`
- Create: `src/lib/sso/types.ts`
- Create: `src/lib/sso/providerService.ts`

**Step 1: Create SSO types**

Create `src/lib/sso/types.ts`:

```typescript
import { z } from 'zod'

export const OIDCProviderConfigSchema = z.object({
  providerId: z.string().min(1),
  name: z.string().min(1),
  issuer: z.string().url(),
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
  scopes: z.array(z.string()).default(['openid', 'email', 'profile']),
  pkce: z.boolean().default(true),
  organizationId: z.string().optional(),
  domain: z.string().optional(),
  attributeMapping: z
    .object({
      id: z.string().default('sub'),
      email: z.string().default('email'),
      name: z.string().default('name'),
      groups: z.string().optional()
    })
    .optional()
})

export const SAMLProviderConfigSchema = z.object({
  providerId: z.string().min(1),
  name: z.string().min(1),
  entryPoint: z.string().url(),
  issuer: z.string(),
  cert: z.string().min(1),
  organizationId: z.string().optional(),
  domain: z.string().optional(),
  signatureAlgorithm: z.enum(['sha256', 'sha512']).default('sha256'),
  wantAssertionsSigned: z.boolean().default(true),
  attributeMapping: z
    .object({
      id: z.string().default('nameID'),
      email: z.string().default('email'),
      name: z.string().default('displayName'),
      groups: z.string().optional()
    })
    .optional()
})

export type OIDCProviderConfig = z.infer<typeof OIDCProviderConfigSchema>
export type SAMLProviderConfig = z.infer<typeof SAMLProviderConfigSchema>

export interface SSOProvider {
  id: string
  type: 'oidc' | 'saml'
  name: string
  organizationId?: string
  domain?: string
  enabled: boolean
  config: OIDCProviderConfig | SAMLProviderConfig
  createdAt: Date
  updatedAt: Date
}

export interface GroupRoleMapping {
  groupPattern: string
  role: string
}
```

**Step 2: Update auth.ts with SSO configuration**

Modify `src/lib/auth.ts`:

```typescript
import { betterAuth } from 'better-auth'
import { organization, admin } from 'better-auth/plugins'
import { sso } from '@better-auth/sso'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg'
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env.NODE_ENV === 'production'
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
      teams: {
        enabled: true
      },
      allowUserToCreateOrganization: false
    }),

    admin({
      defaultRole: 'user'
    }),

    sso({
      // Organization provisioning - auto-add users to org on SSO login
      organizationProvisioning: {
        disabled: false,
        defaultRole: 'user',
        getRole: async ({ user, userInfo, provider }) => {
          // Map groups to roles based on provider configuration
          const groups = userInfo.attributes?.groups as string[] | undefined
          if (!groups) return 'user'

          // Check for admin groups
          if (groups.some((g) => /admin|owner|lead/i.test(g))) {
            return 'teamAdmin'
          }

          // Check for power user groups
          if (groups.some((g) => /power|senior|manager/i.test(g))) {
            return 'powerUser'
          }

          return 'user'
        }
      },

      // User provisioning callback
      provisionUser: async ({ user, userInfo, token, provider }) => {
        console.log(`SSO user provisioned: ${user.email} via ${provider.id}`)
        // Additional provisioning logic can go here
        // e.g., sync to external systems, send welcome notification
      }
    })
  ],

  advanced: {
    database: {
      generateId: () => crypto.randomUUID()
    }
  }
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
```

**Step 3: Create SSO provider service**

Create `src/lib/sso/providerService.ts`:

```typescript
import { auth } from '@/lib/auth'
import type { OIDCProviderConfig, SAMLProviderConfig, SSOProvider } from './types'
import { OIDCProviderConfigSchema, SAMLProviderConfigSchema } from './types'

export class SSOProviderService {
  async registerOIDCProvider(
    config: OIDCProviderConfig,
    context: { userId: string; orgId: string }
  ): Promise<SSOProvider> {
    const validated = OIDCProviderConfigSchema.parse(config)

    // Register with Better Auth SSO plugin
    const result = await auth.api.registerSSOProvider({
      body: {
        providerId: validated.providerId,
        type: 'oidc',
        domain: validated.domain,
        organizationId: validated.organizationId || context.orgId,
        oidcConfig: {
          issuer: validated.issuer,
          clientId: validated.clientId,
          clientSecret: validated.clientSecret,
          scopes: validated.scopes,
          pkce: validated.pkce,
          mapping: validated.attributeMapping
        }
      }
    })

    return {
      id: result.id,
      type: 'oidc',
      name: validated.name,
      organizationId: validated.organizationId || context.orgId,
      domain: validated.domain,
      enabled: true,
      config: validated,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  async registerSAMLProvider(
    config: SAMLProviderConfig,
    context: { userId: string; orgId: string }
  ): Promise<SSOProvider> {
    const validated = SAMLProviderConfigSchema.parse(config)

    const result = await auth.api.registerSSOProvider({
      body: {
        providerId: validated.providerId,
        type: 'saml',
        domain: validated.domain,
        organizationId: validated.organizationId || context.orgId,
        samlConfig: {
          entryPoint: validated.entryPoint,
          issuer: validated.issuer,
          cert: validated.cert,
          signatureAlgorithm: validated.signatureAlgorithm,
          wantAssertionsSigned: validated.wantAssertionsSigned,
          mapping: validated.attributeMapping
        }
      }
    })

    return {
      id: result.id,
      type: 'saml',
      name: validated.name,
      organizationId: validated.organizationId || context.orgId,
      domain: validated.domain,
      enabled: true,
      config: validated,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  async listProviders(orgId: string): Promise<SSOProvider[]> {
    // Better Auth stores providers - query them
    const providers = await auth.api.listSSOProviders({
      query: { organizationId: orgId }
    })

    return providers.map((p: any) => ({
      id: p.id,
      type: p.type,
      name: p.name || p.providerId,
      organizationId: p.organizationId,
      domain: p.domain,
      enabled: p.enabled ?? true,
      config: p.type === 'oidc' ? p.oidcConfig : p.samlConfig,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt)
    }))
  }

  async deleteProvider(providerId: string): Promise<void> {
    await auth.api.deleteSSOProvider({
      body: { providerId }
    })
  }
}

export const ssoProviderService = new SSOProviderService()
```

**Step 4: Commit**

```bash
git add src/lib/auth.ts src/lib/sso/
git commit -m "feat(sso): configure Better Auth SSO with organization provisioning"
```

---

### Task 10.2: Create SSO Provider Setup UI

**Files:**

- Create: `src/app/api/sso/providers/route.ts`
- Create: `src/components/sso/SSOProviderList.tsx`
- Create: `src/components/sso/AddOIDCProviderDialog.tsx`
- Create: `src/components/sso/AddSAMLProviderDialog.tsx`
- Create: `src/hooks/useSSOProviders.ts`

**Step 1: Create SSO API route**

Create `src/app/api/sso/providers/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ssoProviderService } from '@/lib/sso/providerService'
import { OIDCProviderConfigSchema, SAMLProviderConfigSchema } from '@/lib/sso/types'
import { logAuditEvent } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['orgAdmin', 'globalAdmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const providers = await ssoProviderService.listProviders(
    session.session.activeOrganizationId!
  )

  return NextResponse.json(providers)
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!['orgAdmin', 'globalAdmin'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { type, ...config } = body

  const context = {
    userId: session.user.id,
    orgId: session.session.activeOrganizationId!
  }

  try {
    let provider

    if (type === 'oidc') {
      const validated = OIDCProviderConfigSchema.parse(config)
      provider = await ssoProviderService.registerOIDCProvider(validated, context)
    } else if (type === 'saml') {
      const validated = SAMLProviderConfigSchema.parse(config)
      provider = await ssoProviderService.registerSAMLProvider(validated, context)
    } else {
      return NextResponse.json({ error: 'Invalid provider type' }, { status: 400 })
    }

    await logAuditEvent({
      actorId: session.user.id,
      actorEmail: session.user.email,
      actorRole: session.user.role,
      orgId: context.orgId,
      action: 'sso_provider.create',
      category: 'security',
      severity: 'high',
      resourceType: 'sso_provider',
      resourceId: provider.id,
      resourceName: provider.name,
      outcome: 'success',
      detail: { type }
    })

    return NextResponse.json(provider, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create provider', details: String(error) },
      { status: 500 }
    )
  }
}
```

**Step 2: Create useSSOProviders hook**

Create `src/hooks/useSSOProviders.ts`:

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SSOProvider, OIDCProviderConfig, SAMLProviderConfig } from '@/lib/sso/types'

async function fetchProviders(): Promise<SSOProvider[]> {
  const response = await fetch('/api/sso/providers')
  if (!response.ok) throw new Error('Failed to fetch SSO providers')
  return response.json()
}

async function createOIDCProvider(config: OIDCProviderConfig): Promise<SSOProvider> {
  const response = await fetch('/api/sso/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'oidc', ...config })
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create OIDC provider')
  }
  return response.json()
}

async function createSAMLProvider(config: SAMLProviderConfig): Promise<SSOProvider> {
  const response = await fetch('/api/sso/providers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'saml', ...config })
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create SAML provider')
  }
  return response.json()
}

async function deleteProvider(providerId: string): Promise<void> {
  const response = await fetch(`/api/sso/providers/${providerId}`, {
    method: 'DELETE'
  })
  if (!response.ok) throw new Error('Failed to delete provider')
}

export function useSSOProviders() {
  return useQuery({
    queryKey: ['ssoProviders'],
    queryFn: fetchProviders
  })
}

export function useCreateOIDCProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createOIDCProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssoProviders'] })
    }
  })
}

export function useCreateSAMLProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSAMLProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssoProviders'] })
    }
  })
}

export function useDeleteSSOProvider() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssoProviders'] })
    }
  })
}
```

**Step 3: Commit**

```bash
git add src/app/api/sso/ src/hooks/useSSOProviders.ts
git commit -m "feat(sso): add SSO provider API and hooks"
```

---

## Phase 11: Kubernetes Deployment

### Task 11.1: Create Helm Chart Structure

**Files:**

- Create: `helm/agent-ui/Chart.yaml`
- Create: `helm/agent-ui/values.yaml`
- Create: `helm/agent-ui/templates/_helpers.tpl`
- Create: `helm/agent-ui/templates/deployment.yaml`
- Create: `helm/agent-ui/templates/service.yaml`
- Create: `helm/agent-ui/templates/configmap.yaml`
- Create: `helm/agent-ui/templates/secret.yaml`
- Create: `helm/agent-ui/templates/ingress.yaml`

**Step 1: Create Chart.yaml**

Create `helm/agent-ui/Chart.yaml`:

```yaml
apiVersion: v2
name: agent-ui
description: Enterprise Agent UI for AgentOS
type: application
version: 0.1.0
appVersion: "0.3.0"
keywords:
  - agent-ui
  - agentos
  - ai
  - enterprise
maintainers:
  - name: Agent UI Team
home: https://github.com/your-org/agent-ui
sources:
  - https://github.com/your-org/agent-ui
```

**Step 2: Create values.yaml**

Create `helm/agent-ui/values.yaml`:

```yaml
# Default values for agent-ui
replicaCount: 2

image:
  repository: agent-ui
  pullPolicy: IfNotPresent
  tag: ""

imagePullSecrets: []
nameOverride: ""
fullnameOverride: ""

serviceAccount:
  create: true
  automount: true
  annotations: {}
  name: ""

podAnnotations: {}
podLabels: {}

podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1001
  runAsGroup: 1001
  fsGroup: 1001

securityContext:
  allowPrivilegeEscalation: false
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: true

service:
  type: ClusterIP
  port: 80
  targetPort: 3000

ingress:
  enabled: false
  className: ""
  annotations: {}
  hosts:
    - host: agent-ui.local
      paths:
        - path: /
          pathType: Prefix
  tls: []

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

pdb:
  enabled: true
  minAvailable: 1

nodeSelector: {}
tolerations: []
affinity: {}

# Application configuration
config:
  nodeEnv: production
  agentOSUrl: http://agentos:7777
  nextPublicAppUrl: https://agent-ui.example.com

# Secrets (should be provided via external secret management)
secrets:
  # Set to true to create secret from values (not recommended for production)
  create: false
  # External secret name to use
  existingSecret: ""
  # Values (only used if create: true)
  databaseUrl: ""
  betterAuthSecret: ""
  # SSO configuration
  entraClientId: ""
  entraClientSecret: ""
  entraTenantId: ""

# Database configuration
database:
  # Use external database
  external: true
  # Connection details (if not using existingSecret)
  host: ""
  port: 5432
  name: agent_ui
  user: ""
  sslMode: require

# Redis configuration (optional)
redis:
  enabled: false
  external: true
  host: ""
  port: 6379

# Observability
observability:
  enabled: false
  otlpEndpoint: ""
```

**Step 3: Create _helpers.tpl**

Create `helm/agent-ui/templates/_helpers.tpl`:

```yaml
{{/*
Expand the name of the chart.
*/}}
{{- define "agent-ui.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "agent-ui.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "agent-ui.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "agent-ui.labels" -}}
helm.sh/chart: {{ include "agent-ui.chart" . }}
{{ include "agent-ui.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "agent-ui.selectorLabels" -}}
app.kubernetes.io/name: {{ include "agent-ui.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "agent-ui.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "agent-ui.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Get the secret name
*/}}
{{- define "agent-ui.secretName" -}}
{{- if .Values.secrets.existingSecret }}
{{- .Values.secrets.existingSecret }}
{{- else }}
{{- include "agent-ui.fullname" . }}
{{- end }}
{{- end }}
```

**Step 4: Create deployment.yaml**

Create `helm/agent-ui/templates/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "agent-ui.fullname" . }}
  labels:
    {{- include "agent-ui.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "agent-ui.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
        {{- with .Values.podAnnotations }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
      labels:
        {{- include "agent-ui.labels" . | nindent 8 }}
        {{- with .Values.podLabels }}
        {{- toYaml . | nindent 8 }}
        {{- end }}
    spec:
      {{- with .Values.imagePullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      serviceAccountName: {{ include "agent-ui.serviceAccountName" . }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
        - name: {{ .Chart.Name }}
          securityContext:
            {{- toYaml .Values.securityContext | nindent 12 }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.targetPort }}
              protocol: TCP
          envFrom:
            - configMapRef:
                name: {{ include "agent-ui.fullname" . }}
            - secretRef:
                name: {{ include "agent-ui.secretName" . }}
          livenessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 15
            periodSeconds: 20
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
            timeoutSeconds: 3
            failureThreshold: 3
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          {{- if .Values.securityContext.readOnlyRootFilesystem }}
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: nextjs-cache
              mountPath: /app/.next/cache
          {{- end }}
      {{- if .Values.securityContext.readOnlyRootFilesystem }}
      volumes:
        - name: tmp
          emptyDir: {}
        - name: nextjs-cache
          emptyDir: {}
      {{- end }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
```

**Step 5: Commit**

```bash
git add helm/
git commit -m "feat(k8s): add Helm chart structure with deployment templates"
```

---

### Task 11.2: Create HPA and PDB

**Files:**

- Create: `helm/agent-ui/templates/hpa.yaml`
- Create: `helm/agent-ui/templates/pdb.yaml`

**Step 1: Create HPA**

Create `helm/agent-ui/templates/hpa.yaml`:

```yaml
{{- if .Values.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "agent-ui.fullname" . }}
  labels:
    {{- include "agent-ui.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "agent-ui.fullname" . }}
  minReplicas: {{ .Values.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.autoscaling.maxReplicas }}
  metrics:
    {{- if .Values.autoscaling.targetCPUUtilizationPercentage }}
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetCPUUtilizationPercentage }}
    {{- end }}
    {{- if .Values.autoscaling.targetMemoryUtilizationPercentage }}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: {{ .Values.autoscaling.targetMemoryUtilizationPercentage }}
    {{- end }}
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
      selectPolicy: Max
{{- end }}
```

**Step 2: Create PDB**

Create `helm/agent-ui/templates/pdb.yaml`:

```yaml
{{- if .Values.pdb.enabled }}
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "agent-ui.fullname" . }}
  labels:
    {{- include "agent-ui.labels" . | nindent 4 }}
spec:
  {{- if .Values.pdb.minAvailable }}
  minAvailable: {{ .Values.pdb.minAvailable }}
  {{- end }}
  {{- if .Values.pdb.maxUnavailable }}
  maxUnavailable: {{ .Values.pdb.maxUnavailable }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "agent-ui.selectorLabels" . | nindent 6 }}
{{- end }}
```

**Step 3: Commit**

```bash
git add helm/agent-ui/templates/hpa.yaml helm/agent-ui/templates/pdb.yaml
git commit -m "feat(k8s): add HPA and PDB for high availability"
```

---

## Phase 12: Testing & Documentation

### Task 12.1: Create E2E Tests for Auth Flows

**Files:**

- Create: `e2e/playwright.config.ts`
- Create: `e2e/auth/login.spec.ts`
- Create: `e2e/auth/sso.spec.ts`
- Create: `e2e/fixtures/auth.ts`

**Step 1: Create Playwright config**

Create `e2e/playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI
      }
})
```

**Step 2: Create auth fixture**

Create `e2e/fixtures/auth.ts`:

```typescript
import { test as base, Page } from '@playwright/test'

interface AuthFixtures {
  authenticatedPage: Page
  adminPage: Page
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login as regular user
    await page.goto('/login')
    await page.fill('[name="email"]', 'user@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    await use(page)
  },

  adminPage: async ({ page }, use) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('[name="email"]', 'admin@example.com')
    await page.fill('[name="password"]', 'adminpassword123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')

    await use(page)
  }
})

export { expect } from '@playwright/test'
```

**Step 3: Create login tests**

Create `e2e/auth/login.spec.ts`:

```typescript
import { test, expect } from '../fixtures/auth'

test.describe('Authentication', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'user@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.waitForURL('/')
    await expect(page.getByRole('navigation')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[name="email"]', 'user@example.com')
    await page.fill('[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.getByText(/invalid credentials/i)).toBeVisible()
  })

  test('should logout successfully', async ({ authenticatedPage }) => {
    await authenticatedPage.click('[data-testid="user-menu"]')
    await authenticatedPage.click('[data-testid="logout"]')

    await authenticatedPage.waitForURL('/login')
    await expect(
      authenticatedPage.getByRole('heading', { name: /sign in/i })
    ).toBeVisible()
  })

  test('should redirect unauthenticated users', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL('/login?redirect=/admin')
  })
})
```

**Step 4: Create SSO tests**

Create `e2e/auth/sso.spec.ts`:

```typescript
import { test, expect } from '../fixtures/auth'

test.describe('SSO Authentication', () => {
  test('should show SSO options on login page', async ({ page }) => {
    await page.goto('/login')

    // Check for SSO buttons if configured
    const ssoSection = page.locator('[data-testid="sso-options"]')
    if (await ssoSection.isVisible()) {
      await expect(ssoSection.getByRole('button')).toHaveCount.greaterThan(0)
    }
  })

  test('admin can access SSO provider configuration', async ({ adminPage }) => {
    await adminPage.goto('/admin')
    await adminPage.click('text=System')

    await expect(adminPage.getByText(/sso providers/i)).toBeVisible()
  })

  test('admin can add OIDC provider', async ({ adminPage }) => {
    await adminPage.goto('/admin')
    await adminPage.click('text=System')
    await adminPage.click('[data-testid="add-sso-provider"]')

    // Fill OIDC form
    await adminPage.click('[data-testid="provider-type-oidc"]')
    await adminPage.fill('[name="providerId"]', 'test-oidc')
    await adminPage.fill('[name="name"]', 'Test OIDC Provider')
    await adminPage.fill('[name="issuer"]', 'https://issuer.example.com')
    await adminPage.fill('[name="clientId"]', 'test-client-id')
    await adminPage.fill('[name="clientSecret"]', 'test-client-secret')

    await adminPage.click('button[type="submit"]')

    await expect(adminPage.getByText(/provider created/i)).toBeVisible()
  })

  test('non-admin cannot access SSO configuration', async ({
    authenticatedPage
  }) => {
    await authenticatedPage.goto('/admin')

    // Should not see System tab or be redirected
    const systemTab = authenticatedPage.getByText('System')
    await expect(systemTab).not.toBeVisible()
  })
})
```

**Step 5: Update package.json with test scripts**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

**Step 6: Commit**

```bash
git add e2e/ package.json
git commit -m "test(e2e): add Playwright E2E tests for authentication flows"
```

---

### Task 12.2: Create Integration Tests for RBAC

**Files:**

- Create: `src/__tests__/permissions.test.ts`
- Create: `src/__tests__/setup.ts`
- Create: `vitest.config.ts`

**Step 1: Create Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/__tests__/']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

**Step 2: Create test setup**

Create `src/__tests__/setup.ts`:

```typescript
import { beforeAll, afterAll, afterEach } from 'vitest'

// Mock fetch globally
global.fetch = vi.fn()

beforeAll(() => {
  // Setup before all tests
})

afterEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  // Cleanup after all tests
})
```

**Step 3: Create permissions tests**

Create `src/__tests__/permissions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  getRolePermissions,
  canPerformAction
} from '@/lib/permissions'

describe('Permissions System', () => {
  describe('getRolePermissions', () => {
    it('should return correct permissions for user role', () => {
      const permissions = getRolePermissions('user')

      expect(permissions).toContain('agent:run:assigned')
      expect(permissions).toContain('session:create')
      expect(permissions).not.toContain('member:invite')
      expect(permissions).not.toContain('organization:update')
    })

    it('should return correct permissions for teamLead role', () => {
      const permissions = getRolePermissions('teamLead')

      expect(permissions).toContain('agent:run:assigned')
      expect(permissions).toContain('session:view:team')
      expect(permissions).toContain('member:invite')
      expect(permissions).not.toContain('organization:update')
    })

    it('should return correct permissions for orgAdmin role', () => {
      const permissions = getRolePermissions('orgAdmin')

      expect(permissions).toContain('organization:update')
      expect(permissions).toContain('member:*')
      expect(permissions).toContain('audit:view:org')
    })

    it('should return all permissions for globalAdmin role', () => {
      const permissions = getRolePermissions('globalAdmin')

      expect(permissions).toContain('*')
    })
  })

  describe('hasPermission', () => {
    it('should return true for exact permission match', () => {
      const userPermissions = ['agent:run:assigned', 'session:create']

      expect(hasPermission(userPermissions, 'agent:run:assigned')).toBe(true)
      expect(hasPermission(userPermissions, 'session:create')).toBe(true)
    })

    it('should return false for missing permission', () => {
      const userPermissions = ['agent:run:assigned']

      expect(hasPermission(userPermissions, 'member:invite')).toBe(false)
    })

    it('should handle wildcard permissions', () => {
      const adminPermissions = ['member:*']

      expect(hasPermission(adminPermissions, 'member:invite')).toBe(true)
      expect(hasPermission(adminPermissions, 'member:remove')).toBe(true)
      expect(hasPermission(adminPermissions, 'agent:create')).toBe(false)
    })

    it('should handle global wildcard', () => {
      const globalAdminPermissions = ['*']

      expect(hasPermission(globalAdminPermissions, 'anything')).toBe(true)
      expect(hasPermission(globalAdminPermissions, 'member:invite')).toBe(true)
    })
  })

  describe('canPerformAction', () => {
    it('should check action permissions correctly', () => {
      const context = {
        role: 'teamLead' as const,
        permissions: getRolePermissions('teamLead'),
        resourceOwnerId: 'other-user',
        userId: 'current-user'
      }

      expect(canPerformAction(context, 'member:invite')).toBe(true)
      expect(canPerformAction(context, 'organization:update')).toBe(false)
    })

    it('should allow owners to manage their own resources', () => {
      const context = {
        role: 'user' as const,
        permissions: getRolePermissions('user'),
        resourceOwnerId: 'current-user',
        userId: 'current-user'
      }

      expect(canPerformAction(context, 'session:delete:own')).toBe(true)
    })
  })
})
```

**Step 4: Update package.json**

Add to `package.json` scripts and devDependencies:

```json
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.4.0",
    "vitest": "^3.2.0",
    "@vitest/coverage-v8": "^3.2.0",
    "jsdom": "^26.1.0"
  }
}
```

**Step 5: Commit**

```bash
git add src/__tests__/ vitest.config.ts package.json
git commit -m "test(unit): add Vitest integration tests for RBAC permissions"
```

---

## Summary

This implementation plan covers:

| Phase | Tasks | Components |
|-------|-------|------------|
| **Phase 8** | Knowledge Base Management | API routes, AgentOS client, UI components, document upload |
| **Phase 9** | Integration System | Webhook dispatcher, Slack/Teams clients, SIEM export |
| **Phase 10** | SSO Configuration | Better Auth SSO plugin, OIDC/SAML provider setup |
| **Phase 11** | Kubernetes Deployment | Helm chart, HPA, PDB, production configuration |
| **Phase 12** | Testing | Playwright E2E, Vitest unit tests, RBAC integration tests |

### Dependencies to Install

```bash
# Testing
pnpm add -D vitest @vitest/coverage-v8 @vitejs/plugin-react jsdom
pnpm add -D @playwright/test

# Runtime (if not already installed)
pnpm add zod
```

### Environment Variables Required

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/agent_ui

# Auth
BETTER_AUTH_SECRET=your-secret-key-min-32-chars

# AgentOS
NEXT_PUBLIC_AGENT_OS_URL=http://localhost:7777

# SSO (optional)
ENTRA_CLIENT_ID=
ENTRA_CLIENT_SECRET=
ENTRA_TENANT_ID=

# Observability (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=
```
