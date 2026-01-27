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
  method: z.enum(['POST', 'PUT']).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  authType: WebhookAuthType.optional(),
  authToken: z.string().optional(),
  events: z.array(WebhookEventType).min(1),
  filters: z.record(z.string(), z.unknown()).optional()
})

export const UpdateWebhookSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  authType: WebhookAuthType.optional(),
  authToken: z.string().optional(),
  events: z.array(WebhookEventType).min(1).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
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
  authToken?: string
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
