# AgentOS Backend Connectivity

This guide covers connecting agent-ui to an AgentOS backend, with a focus on the [agentos-docker](https://github.com/your-org/agentos-docker) project.

## Overview

Agent UI is a frontend chat interface that connects to an AgentOS backend for agent and team execution. The recommended backend is **agentos-docker**, which provides:

- AgentOS API server (port 8000)
- PostgreSQL database (port 5432)
- Redis cache (port 6379)

This guide covers sharing infrastructure between the two projects for efficient local development.

---

## Quick Start (Hybrid Mode)

The simplest setup: run agent-ui on your host machine while agentos-docker runs in Docker.

**1. Start the backend:**

```bash
cd /path/to/agentos-docker
docker compose --profile redis up -d
```

**2. Create the agent_ui database:**

```bash
# Connect to PostgreSQL
docker exec -it agentos-docker-db-1 psql -U agno

# In psql:
CREATE DATABASE agent_ui;
\q
```

**3. Configure agent-ui:**

```bash
# .env
NEXT_PUBLIC_AGENT_OS_URL=http://localhost:8000
DATABASE_URL=postgresql://agno:agno@localhost:5432/agent_ui
REDIS_URL=redis://localhost:6379
```

**4. Start agent-ui:**

```bash
mise dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Connectivity Options

Choose the option that matches your development workflow:

| Option | agent-ui | agentos-docker | Best For |
|--------|----------|----------------|----------|
| **A: Hybrid** | Host (mise dev) | Docker | Day-to-day development, hot reload |
| **B: Both Docker (Host Gateway)** | Docker | Docker | Testing production builds |
| **C: Shared Network** | Docker | Docker | CI/CD, isolated environments |
| **D: Fully Local** | Host | Host | Maximum control, no Docker |

---

### Option A: Hybrid Mode (Recommended)

Run agent-ui on your host for fast iteration with hot reload, while backend services run in Docker.

```mermaid
┌─────────────────────────────────────────────────────────┐
│  Host Machine                                           │
│  ┌─────────────────┐                                    │
│  │   agent-ui      │                                    │
│  │   (mise dev)    │                                    │
│  │   :3000         │                                    │
│  └────────┬────────┘                                    │
│           │ localhost:8000, :5432, :6379                │
│  ┌────────▼────────────────────────────────────────┐    │
│  │  Docker                                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │
│  │  │ AgentOS  │  │ Postgres │  │  Redis   │      │    │
│  │  │  :8000   │  │  :5432   │  │  :6379   │      │    │
│  │  └──────────┘  └──────────┘  └──────────┘      │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Configuration:**

```bash
# .env
NEXT_PUBLIC_AGENT_OS_URL=http://localhost:8000
DATABASE_URL=postgresql://agno:agno@localhost:5432/agent_ui
REDIS_URL=redis://localhost:6379
```

**Pros:** Fast iteration, hot reload, easy debugging
**Cons:** Requires Node.js on host

---

### Option B: Both in Docker (Host Gateway)

Run both projects in Docker, communicating via the host gateway. This tests the production Docker build.

```mermaid
┌─────────────────────────────────────────────────────────┐
│  Host Machine                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Docker                                         │    │
│  │  ┌──────────────────────────────────────────┐   │    │
│  │  │  agent-ui container                      │   │    │
│  │  │  :3000                                   │   │    │
│  │  │         │                                │   │    │
│  │  │         │ host.docker.internal           │   │    │
│  │  │         ▼                                │   │    │
│  │  └──────────────────────────────────────────┘   │    │
│  │                                                 │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │
│  │  │ AgentOS  │  │ Postgres │  │  Redis   │      │    │
│  │  │  :8000   │  │  :5432   │  │  :6379   │      │    │
│  │  └──────────┘  └──────────┘  └──────────┘      │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Configuration (example.compose.yaml):**

```yaml
services:
  agent-ui:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NEXT_PUBLIC_AGENT_OS_URL=http://host.docker.internal:8000
      - DATABASE_URL=postgresql://agno:agno@host.docker.internal:5432/agent_ui
      - REDIS_URL=redis://host.docker.internal:6379
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

**Usage:**

```bash
cp example.compose.yaml compose.local.yaml
docker compose -f compose.local.yaml up
```

**Pros:** Tests production build, isolated environment
**Cons:** Slower iteration, rebuild required for changes

---

### Option C: Shared Docker Network

Both projects share a Docker network for direct container-to-container communication.

```mermaid
┌─────────────────────────────────────────────────────────┐
│  Docker Network: agentos-network                        │
│  ┌──────────────┐  ┌──────────┐  ┌────────┐  ┌───────┐ │
│  │  agent-ui    │  │ AgentOS  │  │Postgres│  │ Redis │ │
│  │  :3000       │──│ :8000    │  │ :5432  │  │ :6379 │ │
│  │              │  │          │  │        │  │       │ │
│  └──────────────┘  └──────────┘  └────────┘  └───────┘ │
│         │               │             │          │      │
│         └───────────────┴─────────────┴──────────┘      │
│              Direct container DNS resolution            │
└─────────────────────────────────────────────────────────┘
```

**Setup:**

1. Create a shared network:

   ```bash
   docker network create agentos-network
   ```

2. Update agentos-docker compose to use the network:

   ```yaml
   # agentos-docker/compose.yaml
   networks:
     default:
       name: agentos-network
       external: true
   ```

3. Create agent-ui compose with the same network:

   ```yaml
   # agent-ui/compose.local.yaml
   services:
     agent-ui:
       build: .
       ports:
         - '3000:3000'
       environment:
         - NEXT_PUBLIC_AGENT_OS_URL=http://agentos:8000
         - DATABASE_URL=postgresql://agno:agno@agentos-db:5432/agent_ui
         - REDIS_URL=redis://agentos-redis:6379
       networks:
         - agentos-network

   networks:
     agentos-network:
       external: true
   ```

**Pros:** Clean isolation, mimics production, no host gateway needed
**Cons:** More setup, must coordinate network names

---

### Option D: Fully Local (No Docker)

Run everything directly on your host machine.

**Prerequisites:**

- PostgreSQL 15+ with pgvector extension
- Redis 7+
- Python 3.11+ (for AgentOS)
- Node.js 22+ (for agent-ui)

**Configuration:**

```bash
# .env
NEXT_PUBLIC_AGENT_OS_URL=http://localhost:8000
DATABASE_URL=postgresql://your_user:your_pass@localhost:5432/agent_ui
REDIS_URL=redis://localhost:6379
```

**Pros:** Maximum control, no Docker overhead
**Cons:** Manual service management, environment setup complexity

---

## Docker Environment Notes

### OrbStack (macOS)

[OrbStack](https://orbstack.dev/) provides automatic DNS resolution for containers:

```bash
# Containers are accessible via .orb.local domain
NEXT_PUBLIC_AGENT_OS_URL=https://agentos.agentos-docker.orb.local
DATABASE_URL=postgresql://agno:agno@agentos-db.agentos-docker.orb.local:5432/agent_ui
REDIS_URL=redis://agentos-redis.agentos-docker.orb.local:6379
```

**Benefits:**

- No port mapping required for inter-container communication
- Automatic HTTPS with valid certificates
- Containers accessible from host without `localhost` port forwarding

**Container naming:** `{service}.{project}.orb.local`

### Docker Desktop (macOS/Windows)

Uses `host.docker.internal` for host-to-container communication:

```bash
# From inside a container, reach host services
NEXT_PUBLIC_AGENT_OS_URL=http://host.docker.internal:8000
```

**Note:** Requires `extra_hosts` mapping in compose.yaml:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

### Linux

On Linux, `host.docker.internal` is not available by default. Options:

1. **Add extra_hosts mapping** (recommended):

   ```yaml
   extra_hosts:
     - "host.docker.internal:host-gateway"
   ```

2. **Use host network mode:**

   ```yaml
   network_mode: host
   ```

3. **Use the Docker bridge IP:**

   ```bash
   # Find the gateway IP
   docker network inspect bridge | grep Gateway
   # Usually 172.17.0.1
   ```

---

## Configuration Reference

### Environment Variables

| Variable | Hybrid Mode | Docker (Host Gateway) | Shared Network |
|----------|-------------|----------------------|----------------|
| `NEXT_PUBLIC_AGENT_OS_URL` | `http://localhost:8000` | `http://host.docker.internal:8000` | `http://agentos:8000` |
| `DATABASE_URL` | `postgresql://agno:agno@localhost:5432/agent_ui` | `postgresql://agno:agno@host.docker.internal:5432/agent_ui` | `postgresql://agno:agno@agentos-db:5432/agent_ui` |
| `REDIS_URL` | `redis://localhost:6379` | `redis://host.docker.internal:6379` | `redis://agentos-redis:6379` |

### Database Setup

The agent-ui project requires its own database with application tables on the shared PostgreSQL instance.

**Step 1: Create the database**

**Option A: Manual creation**

```bash
docker exec -it agentos-docker-db-1 psql -U agno -c "CREATE DATABASE agent_ui;"
docker exec -it agentos-docker-db-1 psql -U agno -d agent_ui -c "CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

**Option B: Init script (recommended for fresh setups)**

Copy `dev/postgres/init-shared.sql` to agentos-docker's init directory:

```bash
cp dev/postgres/init-shared.sql /path/to/agentos-docker/db/init/02-agent-ui.sql
```

This automatically creates the database with required extensions when PostgreSQL initializes.

**Step 2: Create application tables**

The database schema (user, session, organization, etc.) is managed by Drizzle ORM. Run the db-init container to create tables:

**Using Docker Compose:**

```bash
# From agent-ui directory
docker compose -f docker/db-init/compose.example.yaml up db-init
```

**Using mise (local development):**

```bash
# Ensure DATABASE_URL is set in .env
mise db:push
```

**Using the db-init image directly:**

```bash
docker run --rm \
  -e DATABASE_URL=postgresql://agno:agno@host.docker.internal:5432/agent_ui \
  ghcr.io/agno-oss/agent-ui-db-init:latest
```

See `docker/db-init/compose.example.yaml` for a complete Docker Compose setup.

---

## Troubleshooting

### Connection Refused

**Symptom:** `Error: connect ECONNREFUSED`

**Solutions:**

1. Verify agentos-docker is running: `docker compose ps`
2. Check port exposure: `docker compose port agentos 8000`
3. Verify the URL matches your connectivity option

### Database Does Not Exist

**Symptom:** `database "agent_ui" does not exist`

**Solution:** Create the database:

```bash
docker exec -it agentos-docker-db-1 psql -U agno -c "CREATE DATABASE agent_ui;"
```

### host.docker.internal Not Resolving

**Symptom:** `getaddrinfo ENOTFOUND host.docker.internal`

**Solutions:**

1. Add `extra_hosts` to your compose.yaml:

   ```yaml
   extra_hosts:
     - "host.docker.internal:host-gateway"
   ```

2. On Linux, ensure Docker 20.10+ is installed

### OrbStack DNS Not Working

**Symptom:** `.orb.local` domain not resolving

**Solutions:**

1. Verify OrbStack is running
2. Check container is running: `orb ps`
3. Try flushing DNS: `sudo dscacheutil -flushcache`

### CORS Errors

**Symptom:** `Access-Control-Allow-Origin` errors in browser console

**Solutions:**

1. Ensure AgentOS has CORS configured for your frontend URL
2. Check `NEXT_PUBLIC_APP_URL` matches your actual URL
3. Verify no proxy is modifying headers

### Redis Connection Failed

**Symptom:** `Error: Redis connection to localhost:6379 failed`

**Solutions:**

1. Verify Redis is running: `docker compose --profile redis ps`
2. Check if Redis port is exposed: `docker compose port redis 6379`
3. For Docker-to-Docker, use appropriate hostname (not localhost)
