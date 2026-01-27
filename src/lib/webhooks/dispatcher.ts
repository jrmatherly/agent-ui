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
  return path
    .split('.')
    .reduce((acc: Record<string, unknown> | unknown, part) => {
      if (acc && typeof acc === 'object' && part in (acc as object)) {
        return (acc as Record<string, unknown>)[part]
      }
      return undefined
    }, obj)
}

async function computeHmacSignature(
  body: string,
  secret: string
): Promise<string> {
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
