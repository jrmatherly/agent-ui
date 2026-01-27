# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent UI is a chat interface for AgentOS built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and Zustand. It connects to AgentOS backend instances (default: `http://localhost:7777`) and provides real-time streaming chat with AI agents and teams.

**Requirements:** Node.js 22+, pnpm 10+ (managed via mise)

## Commands

This project uses [mise](https://mise.jdx.dev/) for tool version management and task running.

### Mise Commands (Preferred)

```bash
mise install      # Install Node.js 22 and pnpm 10 (auto-runs on project entry)
mise dev          # Start dev server on localhost:3000 (alias: mise d)
mise build        # Production build (alias: mise b)
mise validate     # Run all checks: lint + format + typecheck (alias: mise v)
mise lint         # Run ESLint (alias: mise l)
mise lint:fix     # Auto-fix ESLint issues
mise format       # Check Prettier formatting (alias: mise f)
mise format:fix   # Auto-fix Prettier formatting
mise typecheck    # TypeScript type checking (alias: mise tc)
mise tasks        # List all available tasks
```

### Release Commands

```bash
mise release              # Interactive release (prompts for version)
mise release:patch        # Create patch release (v1.0.0 -> v1.0.1)
mise release:minor        # Create minor release (v1.0.1 -> v1.1.0)
mise release:major        # Create major release (v1.1.0 -> v2.0.0)
mise run release --yes    # Skip confirmation prompt
```

### pnpm Commands (Alternative)

```bash
pnpm dev          # Start dev server on localhost:3000
pnpm build        # Production build
pnpm validate     # Run all checks: lint + format + typecheck
pnpm lint:fix     # Auto-fix ESLint issues
pnpm format:fix   # Auto-fix Prettier formatting
pnpm typecheck    # TypeScript type checking
```

### Testing Commands

```bash
mise test             # Run Vitest unit tests (alias: mise t)
mise test:coverage    # Run tests with coverage report
mise test:e2e         # Run Playwright E2E tests
mise test:e2e:ui      # Run E2E tests with interactive UI
mise test:e2e:debug   # Debug E2E tests
mise test:e2e:install # Install Playwright browsers (run once after clone)
```

### Database Commands

```bash
mise db:push          # Push schema to database (development)
mise db:generate      # Generate migration files
mise db:migrate       # Run database migrations
mise db:studio        # Open Drizzle Studio (database GUI)
```

**Database Setup:** The app uses PostgreSQL with Drizzle ORM. For Docker deployments:

1. Run `init-shared.sql` to create the `agent_ui` database and extensions
2. Run the `db-init` container to create application tables
3. See `docker/db-init/compose.example.yaml` for full setup

## Architecture

### State Flow

User interactions flow through hooks → Zustand store → component re-renders. The store (`src/store.ts`) is the single source of truth for:

- `endpoint`, `authToken` - Connection settings (persisted to localStorage)
- `agents`, `teams`, `mode` - Available entities and current mode
- `messages`, `isStreaming` - Chat state
- `sessionsData` - Session history

### Streaming Architecture

Messages use Server-Sent Events (SSE) with the `RunEvent` enum for event types:

1. `useAIResponseStream` - Low-level SSE handling with buffer parsing
2. `useAIStreamHandler` - Routes events (RunContent, ToolCallStarted, ReasoningStep, etc.)
3. `useChatActions` - High-level chat operations (initialize, clearChat, addMessage)

### API Layer

- `src/api/routes.ts` - Route definitions (GetAgents, AgentRun, GetSessions, etc.)
- `src/api/os.ts` - API functions with auth header handling

### Component Structure

- `components/ui/` - shadcn/ui primitives (Button, Dialog, Select, etc.)
- `components/chat/Sidebar/` - Entity selection, sessions, auth config
- `components/chat/ChatArea/` - Messages, input, streaming display

### URL State

Query parameters managed with `nuqs`: `agent`, `team`, `session`, `db_id`

### Enterprise Features

The platform includes enterprise multi-tenant features:

- **Authentication**: Better Auth with SSO plugin supporting OIDC and SAML providers
- **Authorization**: Role-based permissions (user, powerUser, teamLead, teamAdmin, orgAdmin, globalAdmin)
- **Knowledge Base**: Scoped knowledge management with AgentOS integration
- **Integrations**: Webhooks, Slack, and Microsoft Teams notifications
- **Audit Logging**: Comprehensive audit trail with SIEM export (JSON, CEF, LEEF)
- **Kubernetes**: Helm chart with HPA and PDB for production deployment

## Code Style

- **Formatting**: Single quotes, no semicolons, no trailing commas
- **Imports**: Use `@/` path alias for `src/` imports
- **Components**: Functional with default exports, `'use client'` for interactive
- **Styling**: Tailwind CSS with `cn()` utility for conditional classes
- **State**: Use selective Zustand subscriptions: `useStore((state) => state.messages)` not `useStore()`

## Key Files

| File | Purpose |
|------|---------|
| `mise.toml` | Mise configuration (tools, env, tasks, hooks) |
| `mise.lock` | Locked tool versions with checksums |
| `scripts/release.sh` | Release automation script |
| `src/store.ts` | Zustand store with persistence |
| `src/types/os.ts` | All TypeScript interfaces and `RunEvent` enum |
| `src/hooks/useChatActions.ts` | Chat operations and initialization |
| `src/hooks/useAIResponseStream.tsx` | SSE stream processing |
| `src/lib/utils.ts` | `cn()`, `isValidUrl()`, `truncateText()` |
| `src/lib/modelProvider.ts` | AI provider icon mapping |
| `src/lib/auth.ts` | Better Auth configuration with SSO |
| `src/lib/permissions.ts` | Role-based permission system |
| `src/lib/audit/logger.ts` | Audit event logging |
| `src/lib/sso/providerService.ts` | SSO provider management |
| `src/lib/knowledge/service.ts` | Knowledge base CRUD operations |
| `src/lib/webhooks/dispatcher.ts` | Webhook event dispatch with HMAC |
| `helm/agent-ui/` | Kubernetes Helm chart |
| `vitest.config.ts` | Vitest test configuration |
| `e2e/playwright.config.ts` | Playwright E2E test configuration |
| `drizzle.config.ts` | Drizzle ORM configuration |
| `src/lib/db/schema.ts` | Database schema definitions |
| `docker/db-init/` | Database initialization container |
