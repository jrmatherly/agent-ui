# Enterprise Features

## Authentication & SSO

| Component | Location |
|-----------|----------|
| Better Auth config | `src/lib/auth.ts` |
| Auth client | `src/lib/auth-client.ts` |
| Admin seed | `src/lib/auth/seedAdmin.ts` |
| Route protection | `proxy.ts` |
| Login page | `src/app/login/page.tsx` |
| Login components | `src/components/auth/` |
| Dashboard | `src/components/dashboard/` |
| SSO types | `src/lib/sso/types.ts` |
| SSO service | `src/lib/sso/providerService.ts` |
| SSO API (admin) | `src/app/api/sso/providers/` |
| SSO API (public) | `src/app/api/auth/sso/providers/` |
| SSO hooks | `src/hooks/useSSOProviders.ts` |

**Auth Flow**: All routes gated → proxy.ts checks session → redirect to /login if unauthenticated

**Supported SSO**: OIDC (discovery endpoint), SAML (certificate)

**Fail-safe Admin**: Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars for emergency access

## Authorization

| Component | Location |
|-----------|----------|
| Permissions | `src/lib/permissions.ts` |
| Auth provider | `src/components/providers/AuthProvider.tsx` |

**Roles**: user → powerUser → teamLead → teamAdmin → orgAdmin → globalAdmin

## Knowledge Base

| Component | Location |
|-----------|----------|
| Types | `src/lib/knowledge/types.ts` |
| Service | `src/lib/knowledge/service.ts` |
| AgentOS client | `src/lib/knowledge/agentosClient.ts` |
| API routes | `src/app/api/knowledge/` |
| UI components | `src/components/knowledge/` |
| Hooks | `src/hooks/useKnowledgeBases.ts` |

**Scopes**: organization, business_unit, team, personal

## Integrations

| Integration | Location |
|-------------|----------|
| Webhooks | `src/lib/webhooks/` |
| Slack | `src/lib/integrations/slack.ts` |
| MS Teams | `src/lib/integrations/teams.ts` |
| API routes | `src/app/api/webhooks/`, `src/app/api/integrations/` |

## Audit Logging

| Component | Location |
|-----------|----------|
| Logger | `src/lib/audit/logger.ts` |
| Types | `src/lib/audit/types.ts` |
| SIEM export | `src/lib/audit/siemExporter.ts` |
| Export API | `src/app/api/audit/export/` |

**Formats**: JSON, CEF, LEEF

## Kubernetes

| Component | Location |
|-----------|----------|
| Helm chart | `helm/agent-ui/` |
| Templates | `helm/agent-ui/templates/` |

**Features**: HPA, PDB, security context, configurable resources

## Testing

| Type | Config | Tests |
|------|--------|-------|
| Unit (Vitest) | `vitest.config.ts` | `src/__tests__/` |
| E2E (Playwright) | `e2e/playwright.config.ts` | `e2e/` |
