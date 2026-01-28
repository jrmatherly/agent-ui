# Mise Configuration

## Files

| File | Purpose |
|------|---------|
| `mise.toml` | Main config (tools, env, tasks, hooks) |
| `mise.lock` | Locked versions (committed) |
| `mise.local.toml` | Local overrides (gitignored) |
| `mise-tasks/release.sh` | Release automation |

## Tools

- **Node.js 22**: `node = { version = "22" }`
- **pnpm 10**: `pnpm = "10"`

## Tasks

| Task | Alias | Description |
|------|-------|-------------|
| `dev` | `d` | Development server |
| `build` | `b` | Production build |
| `validate` | `v` | lint + format + typecheck |
| `lint` | `l` | ESLint |
| `format` | `f` | Prettier check |
| `typecheck` | `tc` | TypeScript |
| `test` | `t` | Vitest |
| `release` | - | Interactive release |

## Environment Variables

Default in mise.toml:
```toml
NEXT_TELEMETRY_DISABLED = "1"
NEXT_PUBLIC_AGENT_OS_URL = "http://localhost:8000"
```

Secrets loaded from `.env` via `_.file = [".env"]`

## Hooks

- **enter**: Auto-installs tools on project entry
- **watch_files**: Auto-formats on file save

## Named Environments

```bash
# Use environment-specific config
MISE_ENV=production mise build
```

Files: `mise.production.toml`, `mise.staging.toml`

## Common Operations

```bash
mise tasks        # List all tasks
mise use node@22  # Update tool version
mise lock         # Regenerate lockfile
mise run release --yes  # Skip confirmation
```
