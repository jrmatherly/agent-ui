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
