# AgentOS Backend Integration Design

> **For Claude:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Document and configure agent-ui to connect to a separate agentos-docker backend project, supporting multiple development workflows with a sensible default.

**Architecture:** Shared PostgreSQL instance (separate databases) and shared Redis. Default connectivity via `host.docker.internal` for Docker-to-Docker, `localhost:8000` for hybrid mode.

---

## Task 1: Create Example Compose File

**Files:**

- Create: `example.compose.yaml`

**Step 1: Create the file**

```yaml
# example.compose.yaml
#
# Example: Connect agent-ui to external agentos-docker backend
#
# Prerequisites:
#   1. agentos-docker running: cd /path/to/agentos-docker && docker compose --profile redis up -d
#   2. agent_ui database created (see docs/AGENTOS_BACKEND.md)
#
# Usage:
#   cp example.compose.yaml compose.local.yaml
#   docker compose -f compose.local.yaml up
#
# See docs/AGENTOS_BACKEND.md for all connectivity options.

name: agent-ui

services:
  agent-ui:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      # AgentOS API (via host gateway)
      - NEXT_PUBLIC_AGENT_OS_URL=http://host.docker.internal:8000
      - NEXT_PUBLIC_APP_URL=http://localhost:3000
      # Auth
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET:-dev-secret-change-in-production}
      # Shared PostgreSQL (agentos-docker), separate database
      - DATABASE_URL=postgresql://agno:agno@host.docker.internal:5432/agent_ui
      # Shared Redis (agentos-docker)
      - REDIS_URL=redis://host.docker.internal:6379
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

**Step 2: Commit**

```bash
git add example.compose.yaml
git commit -m "feat: add example compose for external agentos-docker backend"
```

---

## Task 2: Create Database Init Script

**Files:**

- Create: `dev/postgres/init-shared.sql`

**Step 1: Create the file**

```sql
-- dev/postgres/init-shared.sql
--
-- Example PostgreSQL init script for shared database setup
-- Copy this to agentos-docker/db/init/ to auto-create agent_ui database
--
-- Usage in agentos-docker:
--   1. Copy to agentos-docker/db/init/02-agent-ui.sql
--   2. Mount in compose.yaml:
--      volumes:
--        - ./db/init:/docker-entrypoint-initdb.d
--

-- Create agent_ui database for the agent-ui frontend project
CREATE DATABASE agent_ui;

-- Grant privileges to the agno user (agentos-docker's default user)
GRANT ALL PRIVILEGES ON DATABASE agent_ui TO agno;

-- Connect to agent_ui and enable extensions
\c agent_ui

-- Enable pgvector for knowledge base features
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable uuid-ossp for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

**Step 2: Commit**

```bash
git add dev/postgres/init-shared.sql
git commit -m "feat: add shared database init script for agentos-docker integration"
```

---

## Task 3: Create Backend Connectivity Documentation

**Files:**

- Create: `docs/AGENTOS_BACKEND.md`

**Step 1: Create the documentation file with full content**

The file should include:

- Overview section explaining the two projects
- Quick Start guide (hybrid mode)
- Connectivity Options table (A: Hybrid, B: Both Docker, C: Shared Network, D: Fully Local)
- Configuration Reference (environment variables, database setup, Redis)
- Troubleshooting section

See design sections 5-8 for full content.

**Step 2: Commit**

```bash
git add docs/AGENTOS_BACKEND.md
git commit -m "docs: add AgentOS backend connectivity guide"
```

---

## Task 4: Update Developer Guide

**Files:**

- Modify: `docs/DEVELOPER_GUIDE.md`

**Step 1: Update Prerequisites (line 9)**

Change:

```markdown
- A running AgentOS instance (default: `http://localhost:7777`)
```

To:

```markdown
- A running AgentOS backend - see [AgentOS Backend Connectivity](./AGENTOS_BACKEND.md) for setup options
```

**Step 2: Add Backend Setup section after line 40**

```markdown
### Backend Setup

This project connects to an AgentOS backend for agent/team execution. The recommended setup uses the [agentos-docker](https://github.com/your-org/agentos-docker) project:

```bash
# Start backend (in separate terminal)
cd /path/to/agentos-docker
docker compose --profile redis up -d
```

See [AgentOS Backend Connectivity](./AGENTOS_BACKEND.md) for all configuration options including shared database setup.

**Step 3: Commit**

```bash
git add docs/DEVELOPER_GUIDE.md
git commit -m "docs: add backend setup reference to developer guide"
```

---

## Task 5: Update Environment Documentation

**Files:**

- Modify: `docs/ENVIRONMENT.md`

**Step 1: Update AgentOS Connection section (lines 80-99)**

Update default port from 7777 to 8000, add reference to backend guide, update examples.

**Step 2: Update Local Development example (line 217)**

Change `http://localhost:7777` to `http://localhost:8000`

**Step 3: Update Docker Compose example (line 227)**

Change `http://agent-os:7777` to `http://agentos-api:8000`

**Step 4: Commit**

```bash
git add docs/ENVIRONMENT.md
git commit -m "docs: update environment docs for agentos-docker integration"
```

---

## Task 6: Update .env File

**Files:**

- Modify: `.env`

**Step 1: Update AgentOS Connection section**

Replace:

```bash
NEXT_PUBLIC_AGENT_OS_URL=https://agentos-api.agentos-docker.orb.local
```

With:

```bash
# AgentOS backend API URL
# See docs/AGENTOS_BACKEND.md for all connectivity options
#
# Common configurations:
#   http://localhost:8000              - Hybrid mode (recommended): agent-ui on host, agentos-docker in Docker
#   http://host.docker.internal:8000   - Both in Docker via host gateway
#   http://agentos-api:8000            - Both in Docker via shared network
#
NEXT_PUBLIC_AGENT_OS_URL=http://localhost:8000
```

**Step 2: Update DATABASE_URL**

Change to use agentos-docker's PostgreSQL:

```bash
DATABASE_URL=postgresql://agno:agno@localhost:5432/agent_ui
```

**Step 3: Update REDIS_URL**

Change to use agentos-docker's Redis:

```bash
REDIS_URL=redis://localhost:6379
```

**Step 4: Commit**

```bash
git add .env
git commit -m "feat: update .env defaults for agentos-docker integration"
```

---

## Task 7: Run Validation

**Step 1: Run validation**

```bash
mise validate
```

Expected: All checks pass

**Step 2: Verify documentation renders**

Check markdown files render correctly.

---

## Summary

This implementation provides:

1. **`example.compose.yaml`** - Ready-to-use Docker Compose for connecting to external agentos-docker
2. **`dev/postgres/init-shared.sql`** - Init script for shared database setup
3. **`docs/AGENTOS_BACKEND.md`** - Comprehensive connectivity guide with 4 workflow options
4. **Updated docs** - DEVELOPER_GUIDE.md and ENVIRONMENT.md reference new guide
5. **Updated .env** - Sensible defaults for hybrid development mode

**Default configuration:**

- `NEXT_PUBLIC_AGENT_OS_URL=http://localhost:8000` (hybrid mode)
- `DATABASE_URL=postgresql://agno:agno@localhost:5432/agent_ui` (shared postgres)
- `REDIS_URL=redis://localhost:6379` (shared redis)
