# AgentOS Authentication Guide

This document describes the JWT-based authentication system between Agent UI and AgentOS.

## Overview

Agent UI authenticates with AgentOS using RS256-signed JSON Web Tokens (JWTs). The authentication flow is:

1. User logs in via Better Auth (email/password or SSO)
2. Client requests JWT from `/api/agentos/token` endpoint
3. Server validates Better Auth session and signs JWT with private key
4. Client includes JWT in `Authorization: Bearer <token>` header for AgentOS API calls
5. AgentOS verifies JWT signature using the public key

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │     │  Agent UI   │     │   AgentOS   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Login (Better Auth)                │
       │──────────────────>│                   │
       │                   │                   │
       │ 2. Request JWT    │                   │
       │──────────────────>│                   │
       │                   │                   │
       │ 3. JWT (signed)   │                   │
       │<──────────────────│                   │
       │                   │                   │
       │ 4. API call + JWT │                   │
       │───────────────────────────────────────>
       │                   │                   │
       │ 5. Verify JWT     │                   │
       │                   │                   │ (public key)
       │                   │                   │
       │ 6. Response       │                   │
       │<───────────────────────────────────────
```

## Setup

### 1. Generate RSA Key Pair

```bash
# Generate private key (2048-bit RSA)
openssl genrsa -out private.pem 2048

# Extract public key
openssl rsa -in private.pem -pubout -out public.pem
```

### 2. Configure Agent UI

Add the private key to your `.env` or `.env.local`:

```bash
# Option 1: Single line with escaped newlines
AGENTOS_JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIB...\n-----END RSA PRIVATE KEY-----"

# Option 2: Multi-line (some environments support this)
AGENTOS_JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----"
```

Optional configuration:

```bash
# JWT expiration in seconds (default: 900 = 15 minutes)
AGENTOS_JWT_EXPIRES_IN=900
```

### 3. Configure AgentOS

Add the public key to your AgentOS configuration:

```bash
# In agentos-docker mise.local.toml or environment
JWT_VERIFICATION_KEY="-----BEGIN PUBLIC KEY-----\nMIIBI...\n-----END PUBLIC KEY-----"
```

Or use a JWKS file for key rotation:

```bash
JWT_JWKS_FILE=/path/to/jwks.json
```

## JWT Structure

### Header

```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

### Payload

```json
{
  "sub": "user-id-123",
  "aud": "AgentOS",
  "iat": 1706400000,
  "exp": 1706400900,
  "scopes": ["agents:read", "agents:run", "sessions:read", "sessions:write"],
  "session_id": "better-auth-session-id"
}
```

### Claims Reference

| Claim | Description |
|-------|-------------|
| `sub` | User ID from Better Auth |
| `aud` | Audience - always "AgentOS" |
| `iat` | Issued at timestamp |
| `exp` | Expiration timestamp |
| `scopes` | Array of Agno RBAC scopes |
| `session_id` | Better Auth session ID (optional) |

## Role-to-Scope Mapping

Agent UI maps Better Auth roles to Agno RBAC scopes:

| Role | Scopes |
|------|--------|
| `user` | `agents:read`, `agents:run`, `sessions:read`, `sessions:write` |
| `powerUser` | Above + `system:read` |
| `teamLead` | Above + `teams:read`, `teams:run`, `memories:read` |
| `teamAdmin` | Above + `agents:write`, `sessions:delete`, `workflows:read`, `workflows:run` |
| `orgAdmin` | Above + `knowledge:*`, `memories:write`, `memories:delete`, `metrics:read`, `evals:read`, `traces:read` |
| `globalAdmin` | `agent_os:admin` (full access) |

## Token Lifecycle

### Automatic Refresh

The client automatically refreshes tokens when:

- Token has less than 5 minutes remaining
- A 401 response is received (token expired)

Tokens are stored in memory only (not localStorage) for security.

### On Logout

When a user logs out via Better Auth, the AgentOS token is automatically cleared.

## Error Handling

### HTTP 401 Responses

| `detail` Value | Cause | Resolution |
|----------------|-------|------------|
| `"Authorization header missing"` | No JWT provided | Ensure user is logged in |
| `"Token has expired"` | JWT expired | Token auto-refreshes; retry request |
| `"Invalid token: ..."` | Invalid signature | Check key pair configuration |
| `"Invalid token audience"` | Wrong `aud` claim | Verify audience is "AgentOS" |

### HTTP 403 Responses

| `detail` Value | Cause | Resolution |
|----------------|-------|------------|
| `"Insufficient permissions"` | Missing required scope | User role lacks permission |

### Troubleshooting

**"AGENTOS_JWT_PRIVATE_KEY environment variable is not set"**

- Ensure the private key is set in `.env` or `.env.local`
- Restart the development server after adding the variable

**"Invalid token" errors**

1. Verify key pair matches:
   ```bash
   # Check public key matches private key
   openssl rsa -in private.pem -pubout | diff - public.pem
   ```

2. Check for encoding issues:
   - Ensure newlines are properly escaped (`\n`)
   - No extra whitespace or characters

3. Verify AgentOS has the correct public key:
   ```bash
   # In AgentOS container
   echo $JWT_VERIFICATION_KEY
   ```

**"Insufficient permissions"**

1. Check user role in Better Auth admin panel
2. Verify role-to-scope mapping includes required scope
3. Check AgentOS endpoint's required scope

## Security Considerations

1. **Private key security**: Never commit private keys to version control
2. **Key rotation**: Plan for periodic key rotation using JWKS
3. **Short token lifetime**: Default 15 minutes limits exposure if token is leaked
4. **Memory-only storage**: Tokens not persisted to localStorage
5. **Logout clears tokens**: Prevents token reuse after logout

## Development Mode

When `AGENTOS_JWT_PRIVATE_KEY` is not set:

- JWT signing is disabled
- `/api/agentos/token` returns 503
- AgentOS requests proceed without authentication
- Useful for local development with unsecured AgentOS

## API Reference

### POST /api/agentos/token

Request a new JWT for AgentOS authentication.

**Request:**

```http
POST /api/agentos/token
Cookie: better-auth-session=...
```

**Response (200):**

```json
{
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1706400900000
}
```

**Response (401):**

```json
{
  "error": "Unauthorized - no valid session"
}
```

**Response (503):**

```json
{
  "error": "AgentOS JWT authentication is not configured"
}
```

## Related Documentation

- [Environment Variables](./ENVIRONMENT.md) - Full environment variable reference
- [Architecture](./ARCHITECTURE.md) - System architecture overview
- [AgentOS RBAC Documentation](https://docs.agno.com/agent-os/security/rbac) - Scope reference
