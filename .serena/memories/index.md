# Agent UI - Memory Index

Quick reference for navigating project context. Detailed documentation lives in `docs/`.

## Project Summary

| Aspect | Value |
|--------|-------|
| **Purpose** | Chat interface for AgentOS |
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 (strict) |
| **UI** | React 19, Tailwind CSS 4, Radix UI |
| **State** | Zustand 5 with persist |
| **Runtime** | Node.js 22+, pnpm 10+ (via mise) |

## Key Entry Points

| File | Purpose |
|------|---------|
| `proxy.ts` | Route protection (auth gate) |
| `src/app/login/page.tsx` | Login page (SSO + admin) |
| `src/app/(main)/page.tsx` | Dashboard (landing page) |
| `src/app/(main)/chat/page.tsx` | Chat interface |
| `src/store.ts` | Zustand global state |
| `src/api/os.ts` | AgentOS API functions |
| `src/types/os.ts` | All TypeScript interfaces |
| `mise.toml` | Tool/task configuration |

## Documentation Map

| Need | Read |
|------|------|
| API endpoints, streaming | `docs/API.md` |
| Architecture, state flow, diagrams | `docs/ARCHITECTURE.md` |
| UI components reference | `docs/COMPONENTS.md` |
| Custom hooks (useChatActions, etc.) | `docs/HOOKS.md` |
| Setup, code style, troubleshooting | `docs/DEVELOPER_GUIDE.md` |
| Environment variables | `docs/ENVIRONMENT.md` |

## Route Structure

| Route | Purpose |
|-------|---------|
| `/login` | Login page (public) |
| `/` | Dashboard (authenticated) |
| `/chat` | Chat interface |
| `/admin` | Admin dashboard |
| `/profile` | User profile |
| `/knowledge` | Document management |
| `/knowledge-bases` | Knowledge base containers |

## Serena Memories

| Memory | Purpose |
|--------|---------|
| `suggested_commands` | mise/pnpm command quick reference |
| `task_completion_checklist` | Validation checklist before commits |
| `mise_configuration` | mise.toml detailed reference |
| `enterprise_features` | SSO, auth platform, webhooks, audit |
| `dependency_upgrades_2026_01` | Breaking changes from major upgrades |
| `ui_design_patterns` | Color tokens, flex layouts, hydration patterns |

## Quick Commands

```bash
mise dev          # Start dev server
mise validate     # Lint + format + typecheck
mise build        # Production build
mise db:push      # Push schema to database
mise tasks        # List all tasks
```bash
mise dev          # Start dev server
mise validate     # Lint + format + typecheck
mise build        # Production build
mise tasks        # List all tasks
```

## Code Patterns

- **Imports**: Use `@/` alias for `src/`
- **Styling**: `cn()` utility + Tailwind classes
- **State**: Selective Zustand subscriptions: `useStore((s) => s.field)`
- **Components**: `'use client'` directive for interactive components
- **Hydration**: Use `isMounted` pattern for client-only rendering (see `ui_design_patterns` memory)
- **Colors**: Use `bg-secondary`, `text-foreground`, `bg-brand` (avoid undefined tokens)
- **Flex scroll**: Use `min-h-0 flex-1 overflow-y-auto` for scrollable flex children
