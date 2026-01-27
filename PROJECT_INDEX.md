# Project Index: agent-ui

Generated: 2026-01-27 | Version: 0.3.3 | **Token-efficient reference (~3KB)**

## 📁 Structure

```tree
src/
├── app/                    # Next.js 16 App Router
│   ├── (main)/             # / (dashboard), /chat
│   ├── (enterprise)/       # /admin, /profile, /knowledge
│   ├── login/              # Authentication
│   └── api/                # API routes (auth, sso, knowledge, webhooks)
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── chat/               # Sidebar, ChatArea, Messages
│   ├── dashboard/          # Widgets, metrics
│   ├── auth/               # Login, SSO buttons
│   └── knowledge/          # KB management
├── hooks/                  # React hooks
├── lib/                    # Utilities, services
├── api/                    # AgentOS client
└── types/                  # TypeScript interfaces
```

## 🚀 Entry Points

| File | Purpose |
|------|---------|
| `proxy.ts` | Auth gateway (all routes) |
| `src/store.ts` | Zustand state (persisted) |
| `src/api/os.ts` | AgentOS API client |
| `src/types/os.ts` | TypeScript interfaces |
| `src/lib/auth.ts` | Better Auth config |

## 📦 Core Modules

### Hooks

| Hook | Purpose |
|------|---------|
| `useChatActions` | Chat operations, init |
| `useAIResponseStream` | SSE streaming |
| `useAIStreamHandler` | Event routing |
| `useSessionLoader` | Session management |
| `useSSOProviders` | SSO provider hooks |
| `useKnowledgeBases` | KB operations |

### Lib Services

| Module | Exports |
|--------|---------|
| `lib/auth.ts` | `auth` (Better Auth instance) |
| `lib/permissions.ts` | `Role`, `hasPermission`, `hasRole` |
| `lib/agentos/` | `client`, `jwt`, `tokenStore`, `scopes` |
| `lib/sso/` | `providerService`, `types` |
| `lib/knowledge/` | `service`, `agentosClient` |
| `lib/webhooks/` | `dispatcher`, `service` |
| `lib/audit/` | `logger`, `siemExporter` |

### API Client (`src/api/os.ts`)

```typescript
getAgentsAPI, getTeamsAPI, getStatusAPI
getSessionAPI, getAllSessionsAPI, deleteSessionAPI
```

## 🔧 Configuration

| File | Purpose |
|------|---------|
| `mise.toml` | Tasks, tools, env |
| `package.json` | Dependencies |
| `tailwind.config.ts` | Styling |
| `drizzle.config.ts` | ORM |

## 🔑 Environment Variables

```bash
# Required
BETTER_AUTH_SECRET=      # Session encryption
DATABASE_URL=            # PostgreSQL
NEXT_PUBLIC_AGENT_OS_URL=http://localhost:8000

# Optional
ADMIN_EMAIL=             # Fail-safe admin
ADMIN_PASSWORD=
AGENTOS_JWT_PRIVATE_KEY= # JWT signing
```

## 🧪 Testing

| Type | Command | Config |
|------|---------|--------|
| Unit | `mise test` | `vitest.config.ts` |
| E2E | `mise test:e2e` | `playwright.config.ts` |

## 📝 Quick Start

```bash
mise install              # Install Node.js, pnpm
cp .env.example .env.local
mise dev                  # localhost:3000
```

## 🔗 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.1.5 | Framework |
| react | 19.2.4 | UI |
| zustand | 5.0.10 | State |
| better-auth | 1.4.17 | Auth |
| drizzle-orm | 0.45.1 | ORM |
| tailwindcss | 4.1.18 | Styling |

## 📚 Documentation

- `docs/ARCHITECTURE.md` - System design
- `docs/API.md` - API reference
- `docs/COMPONENTS.md` - Component guide
- `docs/HOOKS.md` - Hook reference
- `CLAUDE.md` - AI assistant guide
