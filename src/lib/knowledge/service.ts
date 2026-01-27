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
            ? sql`${knowledgeBase.teamId} IN (${sql.join(
                context.teamIds.map((id) => sql`${id}`),
                sql`, `
              )})`
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
      .where(
        and(eq(knowledgeBase.id, id), eq(knowledgeBase.orgId, context.orgId))
      )

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
      .where(
        and(eq(knowledgeBase.id, id), eq(knowledgeBase.orgId, context.orgId))
      )
      .returning()

    return kb as KnowledgeBaseWithStats
  }

  async delete(
    id: string,
    context: { userId: string; orgId: string }
  ): Promise<void> {
    await db
      .delete(knowledgeBase)
      .where(
        and(eq(knowledgeBase.id, id), eq(knowledgeBase.orgId, context.orgId))
      )
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
