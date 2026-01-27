# Database initialization container
# Runs Drizzle migrations to set up the agent-ui schema

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Copy schema and config
COPY drizzle.config.ts ./
COPY src/lib/db ./src/lib/db

# Copy entrypoint
COPY docker/db-init/init.sh ./init.sh
RUN chmod +x ./init.sh

ENTRYPOINT ["./init.sh"]
