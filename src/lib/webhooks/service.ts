import { db } from '@/lib/db'
import { webhookEndpoint } from '@/lib/db/schema'
import { eq, and, or, sql } from 'drizzle-orm'
import type {
  CreateWebhook,
  UpdateWebhook,
  WebhookEndpoint,
  WebhookEventType
} from './types'

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
        method: data.method ?? 'POST',
        headers: data.headers,
        authType: data.authType ?? 'none',
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
          sql`${webhookEndpoint.scopeId} IN (${sql.join(
            context.teamIds.map((id) => sql`${id}`),
            sql`, `
          )})`
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
      (w) => w.enabled && w.events.includes(event as WebhookEventType)
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
