# Environment Variables

This document provides a comprehensive reference for all environment variables used by Agent UI.

## Quick Start

```bash
# Copy the example file
cp .env.example .env

# Generate required secrets
openssl rand -base64 32  # Use output for BETTER_AUTH_SECRET

# Edit .env with your values
```

## Variable Reference

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string. Supports pgvector extension for knowledge base features. |

**Format:**

```env
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=MODE
```

**Examples:**

```bash
# Local development
DATABASE_URL=postgresql://agent:agent@localhost:5432/agent_ui

# Production with SSL
DATABASE_URL=postgresql://user:pass@db.example.com:5432/agent_ui?sslmode=require

# Docker Compose (internal network)
DATABASE_URL=postgresql://agent:agent@postgres:5432/agent_ui
```

---

### Authentication (Better Auth)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BETTER_AUTH_SECRET` | **Yes** | — | Secret key for signing tokens and encrypting sessions. Must be at least 32 characters. |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public URL for OAuth callbacks and email verification links. |

**Generation Commands:**

```bash
# Generate BETTER_AUTH_SECRET (recommended)
openssl rand -base64 32

# Alternative using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Alternative using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Examples:**

```bash
# Development
BETTER_AUTH_SECRET=k8J2mN9pQ4rS7tU0vW3xY6zA1bC5dE8fG2hI4jK7lM=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Production
BETTER_AUTH_SECRET=<your-generated-secret>
NEXT_PUBLIC_APP_URL=https://app.example.com
```

---

### Fail-safe Admin Account

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_EMAIL` | No | — | Email address for the fail-safe admin account. Account is auto-created on first startup if not exists. |
| `ADMIN_PASSWORD` | No | — | Password for the fail-safe admin account. Must be strong (minimum 16 characters recommended). |

**Purpose:**

The fail-safe admin account provides emergency access when SSO providers are unavailable or misconfigured. It is created automatically on first application startup if both variables are set and the account doesn't already exist.

**Generation:**

```bash
# Generate a secure password
openssl rand -base64 24
```

**Example:**

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-secure-generated-password
```

**Security Considerations:**

1. **Use strong passwords** - At least 16 characters, generated randomly
2. **Rotate periodically** - Change the password regularly
3. **Audit access** - Admin seed events are logged as critical security events
4. **Disable in production** - Consider not setting these variables once SSO is configured
5. **Never share** - Treat as highly sensitive credentials

---

### AgentOS Connection

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_AGENT_OS_URL` | No | `http://localhost:8000` | AgentOS backend API endpoint URL. See [AgentOS Backend Connectivity](./AGENTOS_BACKEND.md) for setup options. |

**Examples:**

```bash
# Local/hybrid development (agent-ui on host, agentos-docker in Docker)
NEXT_PUBLIC_AGENT_OS_URL=http://localhost:8000

# Docker Compose (host gateway)
NEXT_PUBLIC_AGENT_OS_URL=http://host.docker.internal:8000

# Docker Compose (shared network)
NEXT_PUBLIC_AGENT_OS_URL=http://agentos:8000

# Production
NEXT_PUBLIC_AGENT_OS_URL=https://api.agentos.example.com
```

---

### AgentOS JWT Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AGENTOS_JWT_PRIVATE_KEY` | **Yes** (prod) | — | RSA private key (PEM format) for signing JWTs. The public key must be configured in AgentOS as `JWT_VERIFICATION_KEY`. |
| `AGENTOS_JWT_EXPIRES_IN` | No | `900` | JWT expiration time in seconds (default: 15 minutes). |

**Key Generation:**

```bash
# Generate RSA key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# View keys for copying
cat private.pem  # → AGENTOS_JWT_PRIVATE_KEY in agent-ui
cat public.pem   # → JWT_VERIFICATION_KEY in AgentOS
```

**Environment Variable Format:**

The private key must be provided as a single line with `\n` for newlines, or as a multi-line string in your environment configuration:

```bash
# Single line format (for .env files)
AGENTOS_JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"

# Multi-line format (for Docker secrets, Kubernetes secrets)
AGENTOS_JWT_PRIVATE_KEY=|
  -----BEGIN RSA PRIVATE KEY-----
  MIIEpAIBAAKCAQEA...
  -----END RSA PRIVATE KEY-----
```

**Examples:**

```bash
# Development (JWT disabled - no key set)
# AGENTOS_JWT_PRIVATE_KEY=

# Production (JWT enabled)
AGENTOS_JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"
AGENTOS_JWT_EXPIRES_IN=900
```

See [AgentOS Authentication Guide](./AGENTOS_AUTH.md) for complete setup instructions.

---

### Redis (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REDIS_URL` | No | — | Redis connection string for session caching and rate limiting. |

**Format:**

```env
redis://[:PASSWORD@]HOST:PORT[/DATABASE]
```

**Examples:**

```bash
# Local development
REDIS_URL=redis://localhost:6379

# With authentication
REDIS_URL=redis://:password@localhost:6379

# Docker Compose
REDIS_URL=redis://redis:6379

# Production (Redis Cloud, Upstash, etc.)
REDIS_URL=rediss://default:token@redis.example.com:6379
```

---

### Enterprise SSO

#### Microsoft Entra ID (Azure AD)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENTRA_CLIENT_ID` | No | — | Application (client) ID from Azure App Registration. |
| `ENTRA_CLIENT_SECRET` | No | — | Client secret from Azure App Registration. |
| `ENTRA_TENANT_ID` | No | — | Directory (tenant) ID from Azure. |

**Setup Instructions:**

1. Go to [Azure Portal](https://portal.azure.com) > **App registrations**
2. Click **New registration**
3. Set redirect URI to `{NEXT_PUBLIC_APP_URL}/api/auth/callback/entra`
4. Create a client secret under **Certificates & secrets**
5. Copy the values to your `.env` file

**Generation:** These values are obtained from Azure Portal, not generated locally.

**Example:**

```bash
ENTRA_CLIENT_ID=12345678-1234-1234-1234-123456789abc
ENTRA_CLIENT_SECRET=your~client~secret~value
ENTRA_TENANT_ID=87654321-4321-4321-4321-cba987654321
```

---

### Docker & Deployment

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `IMAGE_NAME` | No | `agent-ui` | Docker image name for builds. |
| `IMAGE_TAG` | No | `latest` | Docker image tag for builds. |
| `PORT` | No | `3000` | Port the application listens on. |
| `NODE_ENV` | No | — | Runtime environment. Set automatically by Next.js (`development` or `production`). |
| `NEXT_TELEMETRY_DISABLED` | No | `1` | Disables Next.js telemetry. Set automatically by mise.toml. |

---

### CI/CD & Testing

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CI` | No | — | Set automatically by CI systems (GitHub Actions, GitLab CI, etc.). |
| `E2E_BASE_URL` | No | `http://localhost:3000` | Base URL for Playwright E2E tests. |

---

### Kubernetes / Helm

When deploying with Helm, secrets are managed via `values.yaml` or external secret management:

| Helm Value | Environment Variable | Description |
|------------|---------------------|-------------|
| `secrets.databaseUrl` | `DATABASE_URL` | PostgreSQL connection string |
| `secrets.betterAuthSecret` | `BETTER_AUTH_SECRET` | Auth secret key |
| `secrets.entraClientId` | `ENTRA_CLIENT_ID` | Microsoft Entra client ID |
| `secrets.entraClientSecret` | `ENTRA_CLIENT_SECRET` | Microsoft Entra client secret |
| `secrets.entraTenantId` | `ENTRA_TENANT_ID` | Microsoft Entra tenant ID |
| `config.agentOSUrl` | `NEXT_PUBLIC_AGENT_OS_URL` | AgentOS backend URL |
| `config.nextPublicAppUrl` | `NEXT_PUBLIC_APP_URL` | Public application URL |

**Example values.yaml:**

```yaml
config:
  agentOSUrl: http://agentos:8000
  nextPublicAppUrl: https://agent-ui.example.com

secrets:
  create: false  # Use external secret management in production
  existingSecret: "agent-ui-secrets"
```

---

## Environment-Specific Configuration

### Local Development

```bash
# .env
DATABASE_URL=postgresql://agno:agno@localhost:5432/agent_ui
BETTER_AUTH_SECRET=dev-secret-at-least-32-characters-long
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_AGENT_OS_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
```

### Docker Compose

```bash
# .env (for compose.yaml with shared network)
DATABASE_URL=postgresql://agno:agno@agentos-db:5432/agent_ui
BETTER_AUTH_SECRET=dev-secret-at-least-32-characters-long
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_AGENT_OS_URL=http://agentos:8000
REDIS_URL=redis://agentos-redis:6379
```

### Production

```bash
# Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)
# Never commit production secrets to version control

DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/agent_ui?sslmode=require
BETTER_AUTH_SECRET=<generated-32-char-secret>
NEXT_PUBLIC_APP_URL=https://app.example.com
NEXT_PUBLIC_AGENT_OS_URL=https://api.example.com
REDIS_URL=rediss://default:token@redis.example.com:6379
```

---

## Security Best Practices

1. **Never commit `.env` files** - The `.gitignore` already excludes `.env`
2. **Use strong secrets** - Always generate `BETTER_AUTH_SECRET` using cryptographic random generators
3. **Rotate secrets regularly** - Especially `BETTER_AUTH_SECRET` and SSO credentials
4. **Use SSL in production** - Set `sslmode=require` for `DATABASE_URL`, use `rediss://` for Redis
5. **External secret management** - Use AWS Secrets Manager, HashiCorp Vault, or Kubernetes secrets in production
6. **Least privilege** - Database users should have minimal required permissions

---

## Troubleshooting

### "You are using the default secret" Error

```bash
[Error [BetterAuthError]: You are using the default secret. Please set `BETTER_AUTH_SECRET`...]
```

**Solution:** Set `BETTER_AUTH_SECRET` in your `.env` file:

```bash
BETTER_AUTH_SECRET=$(openssl rand -base64 32)
```

### Database Connection Refused

```bash
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**

1. Ensure PostgreSQL is running: `pg_isready -h localhost -p 5432`
2. Check `DATABASE_URL` format and credentials
3. For Docker: use service name (`postgres`) instead of `localhost`

### Relation "user" Does Not Exist

```bash
Error: relation "user" does not exist
```

**Cause:** The database exists but application tables haven't been created.

**Solutions:**

1. **Local development:** Run schema push:

   ```bash
   mise db:push
   ```

2. **Docker:** Run the db-init container:

   ```bash
   docker compose -f docker/db-init/compose.example.yaml up db-init
   ```

3. **Kubernetes/Helm:** Ensure `dbInit.enabled: true` in values.yaml (enabled by default)

### AgentOS Connection Failed

```bash
Error: fetch failed
```

**Solutions:**

1. Verify AgentOS is running at the configured URL
2. Check `NEXT_PUBLIC_AGENT_OS_URL` is accessible from the app
3. For Docker: use service name (`agent-os`) instead of `localhost`

---

## Quick Reference

| Variable | Required | Generate Command |
|----------|----------|------------------|
| `DATABASE_URL` | Yes | N/A (configure manually) |
| `BETTER_AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `ADMIN_EMAIL` | No | N/A (your admin email) |
| `ADMIN_PASSWORD` | No | `openssl rand -base64 24` |
| `NEXT_PUBLIC_APP_URL` | No | N/A (your app URL) |
| `NEXT_PUBLIC_AGENT_OS_URL` | No | N/A (your AgentOS URL) |
| `AGENTOS_JWT_PRIVATE_KEY` | Prod | `openssl genrsa 2048` |
| `AGENTOS_JWT_EXPIRES_IN` | No | N/A (default: 900) |
| `REDIS_URL` | No | N/A (configure manually) |
| `ENTRA_CLIENT_ID` | No | N/A (from Azure Portal) |
| `ENTRA_CLIENT_SECRET` | No | N/A (from Azure Portal) |
| `ENTRA_TENANT_ID` | No | N/A (from Azure Portal) |
