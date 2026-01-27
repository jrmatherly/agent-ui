# Command Reference

> **Full docs**: `docs/DEVELOPER_GUIDE.md`

## Mise Tasks (Preferred)

```bash
# Development
mise dev           # Start dev server (d)
mise build         # Production build (b)
mise start         # Start production server

# Quality
mise validate      # All checks: lint + format + typecheck (v)
mise lint          # ESLint (l)
mise lint:fix      # Auto-fix lint
mise format        # Prettier check (f)
mise format:fix    # Auto-fix format
mise typecheck     # TypeScript (tc)

# Testing
mise test          # Vitest unit tests (t)
mise test:coverage # With coverage
mise test:e2e      # Playwright E2E

# Release
mise release       # Interactive release
mise release:patch # Patch bump
mise release:minor # Minor bump
mise release:major # Major bump
```

## Package Management

```bash
pnpm add <pkg>     # Add dependency
pnpm add -D <pkg>  # Add dev dependency
pnpm remove <pkg>  # Remove dependency
```

## Environment

```bash
# Required for auth (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=...

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# AgentOS connection
NEXT_PUBLIC_AGENT_OS_URL=http://localhost:7777
```

> **Full env docs**: `docs/ENVIRONMENT.md`
