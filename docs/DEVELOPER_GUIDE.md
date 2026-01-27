# Developer Guide

## Getting Started

### Prerequisites

- **[mise](https://mise.jdx.dev/)** (recommended) - Manages Node.js 22+ and pnpm 10+ automatically
- Or manually: **Node.js 22+** and **pnpm 10+**
- A running AgentOS backend - see [AgentOS Backend Connectivity](./AGENTOS_BACKEND.md) for setup options

> **Note:** This project uses `"type": "module"` in package.json and requires Node.js 22+ for full ESM compatibility.

### Installation with mise (Recommended)

```bash
# Clone repository
git clone https://github.com/agno-agi/agent-ui.git
cd agent-ui

# Tools install automatically on project entry
# Start development server
mise dev
```

### Installation without mise

```bash
# Clone repository
git clone https://github.com/agno-agi/agent-ui.git
cd agent-ui

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Backend Setup

This project connects to an AgentOS backend for agent/team execution. The recommended setup uses the [agentos-docker](https://github.com/your-org/agentos-docker) project:

```bash
# Start backend (in separate terminal)
cd /path/to/agentos-docker
docker compose --profile redis up -d
```

See [AgentOS Backend Connectivity](./AGENTOS_BACKEND.md) for all configuration options including shared database setup.

### Database Setup

Agent UI uses PostgreSQL with Drizzle ORM for enterprise features (auth, sessions, audit logs, etc.).

**1. Create the database** (if using agentos-docker):

```bash
# Copy init script to agentos-docker
cp dev/postgres/init-shared.sql /path/to/agentos-docker/db/init/02-agent-ui.sql

# Or create manually
docker exec -it agentos-docker-db-1 psql -U agno -c "CREATE DATABASE agent_ui;"
```

**2. Create application tables:**

```bash
# Set DATABASE_URL in .env
echo "DATABASE_URL=postgresql://agno:agno@localhost:5432/agent_ui" >> .env

# Push schema to database
mise db:push
```

**Database commands:**

| Command | Description |
|---------|-------------|
| `mise db:push` | Push schema changes to database (development) |
| `mise db:generate` | Generate migration files |
| `mise db:migrate` | Run migrations (production) |
| `mise db:studio` | Open Drizzle Studio GUI |

See [Environment Variables](./ENVIRONMENT.md) for `DATABASE_URL` format options.

---

## Project Structure

```text
agent-ui/
├── src/
│   ├── app/           # Next.js App Router
│   ├── components/    # React components
│   │   ├── ui/        # Reusable primitives
│   │   └── chat/      # Chat features
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities
│   ├── api/           # API layer
│   ├── types/         # TypeScript types
│   └── store.ts       # Zustand state
├── docs/              # Documentation
└── public/            # Static assets
```

---

## Development Commands

This project uses [mise](https://mise.jdx.dev/) for task running. All commands have pnpm equivalents.

| mise Command | pnpm Equivalent | Description |
|--------------|-----------------|-------------|
| `mise dev` | `pnpm dev` | Start development server |
| `mise build` | `pnpm build` | Build for production |
| `mise start` | `pnpm start` | Start production server |
| `mise lint` | `pnpm lint` | Run ESLint |
| `mise lint:fix` | `pnpm lint:fix` | Fix lint issues |
| `mise format` | `pnpm format` | Check formatting |
| `mise format:fix` | `pnpm format:fix` | Fix formatting |
| `mise typecheck` | `pnpm typecheck` | Run TypeScript check |
| `mise validate` | `pnpm validate` | Run all checks (lint + format + typecheck) |

> **Tip:** Use `mise tasks` to list all available tasks with descriptions.

---

## Code Style

### TypeScript

- Use strict mode (enabled in tsconfig)
- Define interfaces for all props and state
- Use type inference where obvious
- Prefer `interface` over `type` for objects

```typescript
// Good
interface ChatMessageProps {
  message: ChatMessage
  isStreaming?: boolean
}

// Avoid
type ChatMessageProps = {
  message: any
}
```

### React Components

- Use functional components with hooks
- Use `'use client'` directive for client components
- Use default exports for components
- Keep components focused and small

```tsx
'use client'

import { useState } from 'react'

interface Props {
  title: string
}

const MyComponent = ({ title }: Props) => {
  const [count, setCount] = useState(0)

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  )
}

export default MyComponent
```

### Imports

Order imports consistently:

```typescript
// 1. External libraries
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// 2. Internal absolute imports
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'

// 3. Relative imports
import { formatDate } from './utils'

// 4. Types (if separate)
import type { ChatMessage } from '@/types/os'
```

### Styling

- Use Tailwind CSS for all styling
- Use `cn()` utility for conditional classes
- Use semantic color tokens
- Avoid inline styles

```tsx
import { cn } from '@/lib/utils'

<div className={cn(
  'flex items-center gap-2',
  'bg-background text-foreground',
  isActive && 'bg-primary text-primary-foreground',
  className
)}>
```

---

## Adding Features

### Adding a New Component

1. Create component file:

```tsx
// src/components/ui/badge.tsx
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'secondary'
  className?: string
}

const Badge = ({ children, variant = 'default', className }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs',
        variant === 'default' && 'bg-primary text-primary-foreground',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground',
        className
      )}
    >
      {children}
    </span>
  )
}

export { Badge }
```

2. Export from index (if applicable):

```tsx
// src/components/ui/index.ts
export { Badge } from './badge'
```

3. Use the component:

```tsx
import { Badge } from '@/components/ui/badge'

<Badge variant="secondary">New</Badge>
```

### Adding a New Hook

1. Create hook file:

```tsx
// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
```

2. Use the hook:

```tsx
import { useDebounce } from '@/hooks/useDebounce'

const debouncedSearch = useDebounce(searchTerm, 300)
```

### Adding Store State

1. Update the Store interface:

```typescript
// src/store.ts
interface Store {
  // ... existing state
  newFeatureEnabled: boolean
  setNewFeatureEnabled: (enabled: boolean) => void
}
```

2. Add implementation:

```typescript
const useStore = create<Store>()(
  persist(
    (set) => ({
      // ... existing state
      newFeatureEnabled: false,
      setNewFeatureEnabled: (enabled) => set({ newFeatureEnabled: enabled }),
    }),
    {
      // ... persist config
    }
  )
)
```

3. Use in components:

```tsx
const newFeatureEnabled = useStore((state) => state.newFeatureEnabled)
const setNewFeatureEnabled = useStore((state) => state.setNewFeatureEnabled)
```

### Adding API Endpoints

1. Add route definition:

```typescript
// src/api/routes.ts
export const APIRoutes = {
  // ... existing routes
  NewEndpoint: (base: string, id: string) => `${base}/new-endpoint/${id}`,
}
```

2. Add API function:

```typescript
// src/api/os.ts
export const newEndpointAPI = async (
  endpoint: string,
  id: string,
  authToken?: string
): Promise<NewEndpointResponse> => {
  const url = APIRoutes.NewEndpoint(endpoint, id)

  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders(authToken),
  })

  if (!response.ok) {
    throw new Error(`Failed: ${response.statusText}`)
  }

  return response.json()
}
```

---

## State Management

### Zustand Patterns

**Selective subscriptions** (prevents unnecessary re-renders):

```tsx
// Good - only re-renders when messages change
const messages = useStore((state) => state.messages)

// Avoid - re-renders on ANY state change
const store = useStore()
```

**Multiple selectors:**

```tsx
// Option 1: Multiple hooks
const messages = useStore((state) => state.messages)
const isStreaming = useStore((state) => state.isStreaming)

// Option 2: Combined selector (if values are always used together)
const { messages, isStreaming } = useStore((state) => ({
  messages: state.messages,
  isStreaming: state.isStreaming,
}))
```

**Actions in callbacks:**

```tsx
// Access store outside React
const handleClick = () => {
  const currentMessages = useStore.getState().messages
  useStore.getState().setMessages([...currentMessages, newMessage])
}
```

### URL State with nuqs

```tsx
import { useQueryState } from 'nuqs'

// String parameter
const [sessionId, setSessionId] = useQueryState('session')

// With options
const [page, setPage] = useQueryState('page', {
  defaultValue: '1',
  parse: (value) => parseInt(value, 10),
  serialize: (value) => value.toString(),
})
```

---

## Streaming Implementation

### Basic Pattern

```tsx
const { streamResponse } = useAIResponseStream()

const sendMessage = async (content: string) => {
  // Add user message
  addMessage({ role: 'user', content })

  // Add placeholder for response
  addMessage({ role: 'assistant', content: '' })

  setIsStreaming(true)

  await streamResponse({
    apiUrl: `/agents/${agentId}/runs`,
    requestBody: { message: content, stream: true },
    onChunk: (chunk) => {
      // Update last message with new content
      setMessages((prev) => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (chunk.event === 'RunContent') {
          last.content += chunk.content || ''
        }
        return updated
      })
    },
    onComplete: () => setIsStreaming(false),
    onError: (error) => {
      setStreamingErrorMessage(error.message)
      setIsStreaming(false)
    },
  })
}
```

---

## Testing

The project uses **Vitest** for unit tests and **Playwright** for E2E tests.

### Test Commands

| mise Command | Description |
|--------------|-------------|
| `mise test` | Run Vitest unit tests |
| `mise test:coverage` | Run tests with coverage report |
| `mise test:e2e` | Run Playwright E2E tests |
| `mise test:e2e:ui` | Run E2E tests with interactive UI |
| `mise test:e2e:debug` | Debug E2E tests |
| `mise test:e2e:install` | Install Playwright browsers |

### Initial Setup

After cloning the repository, install Playwright browsers (one-time setup):

```bash
mise test:e2e:install
```

This downloads Chromium, Firefox, and WebKit to a local cache (~420MB).

### Unit Tests (Vitest)

Unit tests are located in `src/__tests__/` with `.test.ts` or `.test.tsx` extensions.

**Configuration:** `vitest.config.ts`

```bash
# Run unit tests
mise test

# Run with coverage
mise test:coverage
```

**Writing unit tests:**

```tsx
// src/__tests__/example.test.ts
import { describe, it, expect } from 'vitest'

describe('Example', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2)
  })
})
```

**Testing React components:**

```tsx
// src/__tests__/button.test.tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })
})
```

### E2E Tests (Playwright)

E2E tests are located in `e2e/` with `.spec.ts` extensions.

**Configuration:** `playwright.config.ts` (project root)

```bash
# Run E2E tests (headless)
mise test:e2e

# Run with interactive UI
mise test:e2e:ui

# Debug mode
mise test:e2e:debug
```

**Writing E2E tests:**

```tsx
// e2e/example.spec.ts
import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('main')).toBeVisible()
})
```

**Using fixtures:**

```tsx
// e2e/auth/login.spec.ts
import { test, expect } from '../fixtures/auth'

test('authenticated user can access dashboard', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard')
  await expect(authenticatedPage.getByRole('heading')).toBeVisible()
})
```

### Test File Organization

```text
agent-ui/
├── src/__tests__/           # Unit tests
│   ├── setup.ts             # Vitest setup file
│   └── *.test.ts            # Unit test files
├── e2e/                     # E2E tests
│   ├── fixtures/            # Playwright fixtures
│   │   └── auth.ts          # Authentication fixtures
│   └── auth/                # Auth-related E2E tests
│       ├── login.spec.ts
│       └── sso.spec.ts
├── vitest.config.ts         # Vitest configuration
└── playwright.config.ts     # Playwright configuration
```

---

## Troubleshooting

### Common Issues

**"Error fetching agents"**

- Check AgentOS is running at the configured endpoint
- Verify auth token is correct (if required)
- Check browser console for CORS errors

**Streaming not working**

- Ensure `stream: true` in request body
- Check server supports SSE
- Verify no proxy is blocking chunked responses

**Dark mode not working**

- Ensure `ThemeProvider` wraps the app
- Check `darkMode: 'class'` in tailwind.config

**Store not persisting**

- Check localStorage is available
- Verify `partialize` includes the desired state

### Debug Tools

**React DevTools:**

- Inspect component tree
- Check props and state

**Zustand DevTools:**

```tsx
import { devtools } from 'zustand/middleware'

const useStore = create<Store>()(
  devtools(
    persist(
      (set) => ({ /* ... */ }),
      { /* ... */ }
    )
  )
)
```

**Network Tab:**

- Monitor API requests
- Check SSE stream events

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following code style
4. Run `mise validate` to check all rules
5. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for full guidelines.
