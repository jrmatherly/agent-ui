# Agent UI Documentation

Welcome to the Agent UI documentation. This guide covers architecture, API reference, components, and development practices.

## Table of Contents

| Document | Description |
|----------|-------------|
| [API Reference](./API.md) | REST API endpoints, streaming protocol, request/response formats |
| [Architecture](./ARCHITECTURE.md) | System design, data flow, component hierarchy |
| [Components](./COMPONENTS.md) | UI primitives and chat components reference |
| [Hooks Reference](./HOOKS.md) | Custom React hooks documentation |
| [Developer Guide](./DEVELOPER_GUIDE.md) | Setup, code style, adding features |
| [Environment Variables](./ENVIRONMENT.md) | Configuration reference, secrets, deployment |

## Quick Links

### Getting Started

```bash
# Install tools (auto-runs on project entry with mise)
mise install

# Development
mise dev

# Validate code (lint + format + typecheck)
mise validate
```

> **Note:** If not using mise, substitute `mise <task>` with `pnpm <task>` (e.g., `pnpm dev`).

### Key Files

| File | Purpose |
|------|---------|
| `src/store.ts` | Global state management |
| `src/api/os.ts` | API communication |
| `src/types/os.ts` | TypeScript definitions |
| `src/hooks/useChatActions.ts` | Chat operations |

### Architecture Overview

```text
┌─────────────────────────────────────────┐
│               Next.js App               │
├─────────────────────────────────────────┤
│  Sidebar  │         ChatArea            │
│           │  ┌─────────────────────┐    │
│ • Entity  │  │     MessageArea     │    │
│ • Mode    │  │  ┌───────────────┐  │    │
│ • Auth    │  │  │   Messages    │  │    │
│ • Session │  │  └───────────────┘  │    │
│           │  │     ChatInput       │    │
│           │  └─────────────────────┘    │
├─────────────────────────────────────────┤
│           Hooks & State (Zustand)       │
├─────────────────────────────────────────┤
│              API Layer (SSE)            │
└─────────────────────────────────────────┘
                    │
                    ▼
            AgentOS Backend
```

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, Radix UI, shadcn/ui |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| Database | PostgreSQL + Drizzle ORM |
| Animation | Framer Motion |
| Markdown | react-markdown, remark-gfm |

## Contributing

See the main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
