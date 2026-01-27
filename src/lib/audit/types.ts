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
  categoryOverrides: Partial<
    Record<
      AuditCategory,
      {
        retentionDays?: number
        severityMinimum?: AuditSeverity
      }
    >
  >
  teamOverrides: Record<
    string,
    {
      logUserInput?: boolean
      logAgentOutput?: boolean
      retentionDays?: number
    }
  >
}
