# Docker Configuration Design

**Date:** 2026-01-26
**Status:** Approved
**Author:** Claude (via brainstorming session)

## Overview

This document defines the Docker configuration for agent-ui, a Next.js chat interface for AgentOS. The design supports both local development and production deployment with Kubernetes.

## Requirements

- Development environment with hot reload
- Production-optimized builds (~50-80MB images)
- Flexible backend connection (Docker network, host, external URL)
- Kubernetes-ready deployment
- Separate network with optional AgentOS integration

## Architecture Decisions

### 1. Multi-stage Dockerfile

Four-stage build optimized for Next.js:

| Stage | Purpose | Output |
|-------|---------|--------|
| `base` | Alpine base with libc6-compat | Shared base layer |
| `deps` | Install pnpm dependencies | node_modules |
| `builder` | Build Next.js with standalone | .next/standalone |
| `runner` | Minimal production image | Final ~50-80MB image |

**Rationale:** Standalone output reduces image size by ~90% and eliminates runtime dependency installation.

### 2. Docker Compose Services

| Service | Profile | Purpose |
|---------|---------|---------|
| `agent-ui` | default | Production build |
| `agent-ui-dev` | dev | Development with hot reload |

**Rationale:** Profiles allow single compose file for both workflows.

### 3. Network Strategy

- Primary: `agent-ui` network (standalone operation)
- Optional: `agentos` external network (integration mode)

**Rationale:** Decoupled by default, can join AgentOS stack when needed.

### 4. Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_AGENTOS_URL` | `http://host.docker.internal:8000` | Backend URL |
| `NEXT_PUBLIC_OS_SECURITY_KEY` | (empty) | Auth token |
| `PORT` | `3000` | Container port |
| `IMAGE_NAME` | `agent-ui` | Docker image name |
| `IMAGE_TAG` | `latest` | Docker image tag |

## File Changes

### New Files

#### Dockerfile

```dockerfile
# syntax=docker.io/docker/dockerfile:1

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable pnpm && pnpm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### compose.yaml

```yaml
services:
  agent-ui:
    container_name: agent-ui
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    image: ${IMAGE_NAME:-agent-ui}:${IMAGE_TAG:-latest}
    restart: unless-stopped
    networks:
      - agent-ui
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "${PORT:-3000}:3000"
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      NEXT_PUBLIC_AGENTOS_URL: ${NEXT_PUBLIC_AGENTOS_URL:-http://host.docker.internal:8000}
      NEXT_PUBLIC_OS_SECURITY_KEY: ${NEXT_PUBLIC_OS_SECURITY_KEY:-}

  agent-ui-dev:
    container_name: agent-ui-dev
    build:
      context: .
      dockerfile: Dockerfile
      target: deps
    profiles:
      - dev
    networks:
      - agent-ui
    extra_hosts:
      - "host.docker.internal:host-gateway"
    ports:
      - "${PORT:-3000}:3000"
    volumes:
      - .:/app
      - /app/node_modules
      - /app/.next
    environment:
      NODE_ENV: development
      NEXT_PUBLIC_AGENTOS_URL: ${NEXT_PUBLIC_AGENTOS_URL:-http://host.docker.internal:8000}
      NEXT_PUBLIC_OS_SECURITY_KEY: ${NEXT_PUBLIC_OS_SECURITY_KEY:-}
    command: sh -c "corepack enable pnpm && pnpm dev"

networks:
  agent-ui:
    name: agent-ui

  agentos:
    external: true
    name: agentos
```

#### .env.example

```bash
# AgentOS Connection
NEXT_PUBLIC_AGENTOS_URL=http://host.docker.internal:8000
NEXT_PUBLIC_OS_SECURITY_KEY=

# Docker Image
IMAGE_NAME=agent-ui
IMAGE_TAG=latest

# Container Port
PORT=3000
```

#### k8s/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-ui
  labels:
    app: agent-ui
spec:
  replicas: 2
  selector:
    matchLabels:
      app: agent-ui
  template:
    metadata:
      labels:
        app: agent-ui
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
      containers:
        - name: agent-ui
          image: agent-ui:latest
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 3000
              protocol: TCP
          envFrom:
            - configMapRef:
                name: agent-ui-config
          livenessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
```

#### k8s/service.yaml

```yaml
apiVersion: v1
kind: Service
metadata:
  name: agent-ui
  labels:
    app: agent-ui
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
      name: http
  selector:
    app: agent-ui
```

#### k8s/configmap.yaml

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: agent-ui-config
data:
  NODE_ENV: "production"
  NEXT_PUBLIC_AGENTOS_URL: "http://agentos-api:8000"
```

#### k8s/kustomization.yaml

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml

commonLabels:
  app.kubernetes.io/name: agent-ui
  app.kubernetes.io/component: frontend

images:
  - name: agent-ui
    newTag: latest
```

### Modified Files

#### .dockerignore (replace contents)

```dockerignore
# Dependencies (installed in container)
node_modules

# Build output (built in container)
.next
out

# Git
.git
.gitignore

# Environment files (secrets - never copy)
.env
.env.*
!.env.example

# IDE/Editor
.idea
.vscode
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Documentation (not needed in image)
.docs
docs
*.md
!README.md

# AI tooling
.serena
.claude

# Testing/Development
coverage
.turbo
*.log

# Mise (local tooling)
.mise
mise.local.toml
```

#### next.config.ts (add output: 'standalone')

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  devIndicators: false
}

export default nextConfig
```

## Usage

### Local Development

```bash
# Start development server with hot reload
docker compose --profile dev up agent-ui-dev

# Or use mise/pnpm directly (faster)
mise dev
```

### Production Build

```bash
# Build and run production container
docker compose up agent-ui

# Build only
docker compose build agent-ui
```

### Kubernetes Deployment

```bash
# Build and tag image
docker build -t agent-ui:v0.2.0 .

# Deploy with kustomize
kubectl apply -k k8s/

# Or with custom image tag
cd k8s && kustomize edit set image agent-ui:v0.2.0 && kubectl apply -k .
```

### Connecting to AgentOS

```bash
# When AgentOS is running in Docker
docker compose --profile dev up agent-ui-dev

# Override backend URL
NEXT_PUBLIC_AGENTOS_URL=http://agentos-api:8000 docker compose up agent-ui
```

## References

- [Next.js Standalone Output](https://nextjs.org/docs/pages/api-reference/config/next-config-js/output)
- [Next.js with Docker Example](https://github.com/vercel/next.js/tree/canary/examples/with-docker)
- [Optimizing Next.js Docker Images](https://dev.to/angojay/optimizing-nextjs-docker-images-with-standalone-mode-2nnh)
