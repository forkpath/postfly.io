# ─── Stage 1: Base ────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable pnpm && corepack prepare pnpm@latest --activate
RUN apk add --no-cache libc6-compat

# ─── Stage 2: Install dependencies ───────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/mobile/package.json apps/mobile/package.json
RUN pnpm install --frozen-lockfile

# ─── Stage 3: Build & Prune ──────────────────────────────────────
FROM base AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN pnpm exec nx run engine:prune

# ─── Stage 4: Production ─────────────────────────────────────────
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production
ENV ENGINE_PORT=8000

COPY --from=build /app/dist/services/engine ./
COPY --from=build /app/libs/i18n/src/translations ./libs/i18n/src/translations

RUN pnpm install --prod --frozen-lockfile

EXPOSE 8000
CMD ["node", "main.js"]
