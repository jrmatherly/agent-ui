import { db } from '@/lib/db'
import { auditEvent } from '@/lib/db/schema'
import type { AuditEventInput, AuditConfig } from './types'

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
  private flushInterval: ReturnType<typeof setInterval> | null = null

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
        events.map((event) => ({
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

// Convenience function for simplified audit logging
export async function logAuditEvent(params: {
  actorId: string
  actorEmail?: string
  actorRole?: string
  orgId: string
  teamId?: string
  action: string
  category: AuditEventInput['category']
  severity?: AuditEventInput['severity']
  resourceType?: string
  resourceId?: string
  resourceName?: string
  outcome: AuditEventInput['outcome']
  detail?: Record<string, unknown>
}) {
  await auditLogger.log({
    action: params.action,
    category: params.category,
    severity: params.severity,
    actor: {
      type: 'user',
      id: params.actorId,
      email: params.actorEmail,
      role: params.actorRole,
      orgId: params.orgId,
      teamId: params.teamId
    },
    resource: params.resourceType
      ? {
          type: params.resourceType,
          id: params.resourceId || '',
          name: params.resourceName,
          orgId: params.orgId,
          teamId: params.teamId
        }
      : undefined,
    outcome: params.outcome,
    detail: params.detail
  })
}
