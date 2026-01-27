# Mise-En-Place Integration Design

**Date:** 2026-01-26  
**Status:** Approved  
**Author:** Claude + Jason

## Overview

Integrate Mise-En-Place as the central project management tool for Agent UI, replacing/supplementing npm scripts with a unified system for tool version management, environment configuration, task running, and automation hooks.

## Goals

1. **Reproducible environments** - Lockfile pins exact tool versions
2. **Environment management** - Named environments with dotenv integration for secrets
3. **Task runner** - Parallel execution, file watching, dependencies
4. **Automation** - Auto-install on project entry, format on save
5. **AI integration** - MCP server for assistant queries
6. **Release automation** - Semver tagging with interactive prompts

## File Structure

```tree
agent-ui/
├── mise.toml              # Main configuration
├── mise.lock              # Lockfile (auto-generated, committed)
├── mise.local.toml        # Local overrides (gitignored)
├── mise-tasks/
│   └── release.sh         # Release script with semver automation
├── .env                   # Secrets (gitignored, loaded by mise)
└── .github/workflows/
    ├── ci.yml             # Validation workflow
    └── docker-build.yml   # Docker build + dual registry push
```

## Configuration

### mise.toml

```toml
# Agent UI - Mise Configuration
min_version = "2026.1.0"

# =============================================================================
# Settings
# =============================================================================
[settings]
experimental = true
lockfile = true

# Redact sensitive values from MCP queries
redactions = ["*_KEY", "*_SECRET", "*_TOKEN"]

# =============================================================================
# Tools
# =============================================================================
[tools]
node = "22"
pnpm = "10"

[tools.node.postinstall]
run = "corepack disable 2>/dev/null || true"

[tools.pnpm.postinstall]
run = "pnpm install --frozen-lockfile --silent"

# =============================================================================
# Environment Variables
# =============================================================================
[env]
# Load secrets from .env file (gitignored)
_.file = [".env"]

# Non-secret defaults (committed)
NODE_ENV = "development"
NEXT_TELEMETRY_DISABLED = "1"

# AgentOS connection defaults
NEXT_PUBLIC_OS_ENDPOINT = "http://localhost:7777"

# Optional - validated if present
NEXT_PUBLIC_OS_SECURITY_KEY = { required = false, redact = true }

# Production environment overrides
[env.production]
NODE_ENV = "production"

# Staging environment overrides
[env.staging]
NODE_ENV = "staging"
NEXT_PUBLIC_OS_ENDPOINT = "https://staging-api.example.com"

# =============================================================================
# Hooks
# =============================================================================
[hooks]
# Auto-install tools when entering project
enter = "mise install --quiet"

# Confirmation after tools installed
postinstall = "echo '✓ Tools ready'"

# =============================================================================
# File Watching
# =============================================================================
[[watch_files]]
patterns = [
  "src/**/*.{ts,tsx}",
  "src/**/*.css",
  "*.config.{ts,mjs,cjs,js}",
  "*.md"
]
run = "mise run format:fix --quiet"

# =============================================================================
# Tasks
# =============================================================================

# Development
[tasks.dev]
description = "Start development server"
run = "pnpm next dev -p 3000"
alias = "d"

[tasks.build]
description = "Production build"
run = "pnpm next build"
alias = "b"

[tasks.start]
description = "Start production server"
run = "pnpm next start"
depends = ["build"]

# Code Quality
[tasks.lint]
description = "Run ESLint"
run = "pnpm eslint ."
alias = "l"

[tasks."lint:fix"]
description = "Auto-fix ESLint issues"
run = "pnpm eslint . --fix"

[tasks.format]
description = "Check Prettier formatting"
run = "pnpm prettier --check \"**/*.{ts,tsx,mdx}\" --cache"
alias = "f"

[tasks."format:fix"]
description = "Auto-fix Prettier formatting"
run = "pnpm prettier --write \"**/*.{ts,tsx,mdx}\" --cache"

[tasks.typecheck]
description = "TypeScript type checking"
run = "pnpm tsc --noEmit"
alias = "tc"

[tasks.validate]
description = "Run all checks (lint + format + typecheck)"
depends = ["lint", "format", "typecheck"]
alias = "v"

# Release
[tasks.release]
description = "Create a new release (tag + GitHub release)"
run = "./mise-tasks/release.sh"

[tasks."release:major"]
description = "Create a major release (vX.0.0)"
run = "./mise-tasks/release.sh major"

[tasks."release:minor"]
description = "Create a minor release (vX.Y.0)"
run = "./mise-tasks/release.sh minor"

[tasks."release:patch"]
description = "Create a patch release (vX.Y.Z)"
run = "./mise-tasks/release.sh patch"
```

### mise.local.toml (Template)

```toml
# Local overrides - copy to mise.local.toml and customize
# This file is gitignored

[env]
# Override endpoint for local development
# NEXT_PUBLIC_OS_ENDPOINT = "http://192.168.1.100:7777"

# Local API key
# NEXT_PUBLIC_OS_SECURITY_KEY = "your-local-key"
```

## Release Script

### mise-tasks/release.sh

Features:

- Auto-increment semver (major/minor/patch)
- Interactive prompt with version override
- Clean working directory validation
- GitHub CLI authentication check
- Auto-generated release notes from commits
- Updates package.json version
- Creates and pushes git tag
- Creates GitHub release (triggers Docker workflow)

Usage:

```bash
mise release              # Interactive - prompts for version type
mise release:patch        # Auto-increment patch (v1.0.0 → v1.0.1)
mise release:minor        # Auto-increment minor (v1.0.1 → v1.1.0)
mise release:major        # Auto-increment major (v1.1.0 → v2.0.0)
mise run release v1.2.3   # Specific version override
```

## CI/CD Workflows

### .github/workflows/ci.yml

Triggered on: push to main, pull requests

Steps:

1. Checkout code
2. Install mise via `jdx/mise-action@v2`
3. Install dependencies (`pnpm install --frozen-lockfile`)
4. Run validation (`mise run validate`)
5. Run build (`mise run build`)

### .github/workflows/docker-build.yml

Triggered on: release published

Steps:

1. Checkout code
2. Set up Docker Buildx
3. Login to GHCR
4. Login to DockerHub
5. Build and push to both registries with version + latest tags

Required secrets:

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`

## Implementation Checklist

- [x] Create `mise.toml` with full configuration
- [x] Create `mise-tasks/release.sh` script (with `--yes` flag support)
- [x] Update `.gitignore` to include `mise.local.toml`
- [x] Modify `validate.yml` to use mise (instead of creating new ci.yml)
- [x] Modify `docker-images.yml` for GHCR + version tags (instead of creating new docker-build.yml)
- [x] Run `mise lock` to generate `mise.lock` (Node 22.22.0, pnpm 10.28.1)
- [x] Update CLAUDE.md with mise commands
- [x] Update README.md with mise setup instructions
- [x] Update Serena memories for future session context
- [ ] Commit all changes to repository
- [ ] Add DockerHub secrets to GitHub repository (manual step)
- [ ] Test release workflow with initial tag (manual step)

### Implementation Notes

1. **Workflows**: Modified existing `validate.yml` and `docker-images.yml` instead of creating new files to avoid duplication.

2. **Named Environments**: Removed inline `[env.production]` syntax - mise requires separate files (`mise.production.toml`) for named environments. Added comment explaining how to use them.

3. **Release Script**: Added `--yes`/`-y` flag support for CI automation, matching the pattern from agentos-docker project.

4. **Tool Postinstall**: Used inline TOML syntax `{ version = "22", postinstall = "..." }` for tool configuration.

5. **Docker Tags**: Uses `docker/metadata-action` for semantic versioning tags (`{{version}}`, `{{major}}.{{minor}}`, `latest`).

## Migration Notes

### npm Scripts Compatibility

Existing `package.json` scripts are preserved for compatibility:

- IDEs may still use `npm run dev`
- CI can use either `pnpm run validate` or `mise run validate`

### Developer Onboarding

New developers need:

1. Install mise: `curl https://mise.run | sh`
2. Add to shell: `echo 'eval "$(mise activate bash)"' >> ~/.bashrc`
3. Enter project directory (tools auto-install)

## Version Information

As of January 2026:

- **Node.js 22.x** - Maintenance LTS (until Apr 2027)
- **pnpm 10.28.x** - Latest stable
- **mise 2026.1.x** - Latest stable
