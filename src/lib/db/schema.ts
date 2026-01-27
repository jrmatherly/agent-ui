import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  pgEnum
} from 'drizzle-orm/pg-core'

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
  banExpires: timestamp('ban_expires'),
  // SSO Profile attributes
  department: text('department'),
  jobTitle: text('job_title'),
  manager: text('manager'),
  phone: text('phone'),
  employeeId: text('employee_id'),
  location: text('location'),
  ssoMetadata: jsonb('sso_metadata'),
  ssoProvider: text('sso_provider'),
  ssoLastSync: timestamp('sso_last_sync')
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  // Enterprise extensions
  activeOrganizationId: text('active_organization_id'),
  activeTeamId: text('active_team_id'),
  impersonatedBy: text('impersonated_by')
})

// Better Auth required tables
export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// Better Auth SSO Plugin table (camelCase required - plugin hardcodes model name)
export const ssoProvider = pgTable('ssoProvider', {
  id: text('id').primaryKey(),
  providerId: text('providerId').notNull().unique(),
  issuer: text('issuer').notNull(),
  domain: text('domain').notNull(),
  oidcConfig: text('oidcConfig'), // JSON string
  samlConfig: text('samlConfig'), // JSON string
  userId: text('userId').references(() => user.id, { onDelete: 'cascade' }),
  organizationId: text('organizationId').references(() => organization.id)
})

// Better Auth Invitation table (required by organization plugin)
export const invitation = pgTable('invitation', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role'),
  teamId: text('team_id'),
  status: text('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  inviterId: text('inviter_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
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
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  role: roleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

export const team = pgTable('team', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  metadata: jsonb('metadata')
})

export const teamMember = pgTable('team_member', {
  id: text('id').primaryKey(),
  teamId: text('team_id')
    .notNull()
    .references(() => team.id),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

// Agent Sessions (enterprise-extended)
export const agentSession = pgTable('agent_session', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id),
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id),
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
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at')
})

export const apiKey = pgTable('api_key', {
  id: uuid('id').primaryKey().defaultRandom(),
  serviceAccountId: uuid('service_account_id')
    .notNull()
    .references(() => serviceAccount.id),
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
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  originalRole: roleEnum('original_role').notNull(),
  elevatedRole: roleEnum('elevated_role').notNull(),
  reason: text('reason').notNull(),
  grantedBy: text('granted_by')
    .notNull()
    .references(() => user.id),
  grantedAt: timestamp('granted_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at')
})

// Approval Workflows
export const approvalRequest = pgTable('approval_request', {
  id: uuid('id').primaryKey().defaultRandom(),
  actionType: text('action_type').notNull(),
  actionData: jsonb('action_data').notNull(),
  requesterId: text('requester_id')
    .notNull()
    .references(() => user.id),
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
  orgId: text('org_id')
    .notNull()
    .references(() => organization.id),
  buId: text('bu_id').references(() => organization.id),
  teamId: text('team_id').references(() => team.id),
  userId: text('user_id').references(() => user.id),
  visibility: text('visibility').notNull().default('inherited'),
  config: jsonb('config'),
  documentCount: integer('document_count').default(0),
  totalSizeBytes: integer('total_size_bytes').default(0),
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
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
  createdBy: text('created_by')
    .notNull()
    .references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow()
})

// Team Quotas
export const teamQuota = pgTable('team_quota', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: text('team_id')
    .notNull()
    .references(() => team.id)
    .unique(),
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
