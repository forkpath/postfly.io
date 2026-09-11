# ─── engine: runtime-only image ─────────────────────────────────────
# Build artifacts + pruned lockfile are produced on the host:
#   1. `pnpm nx run engine:build` → dist/services/engine/ (bundle + package.json)
#   2. `node scripts/create-engine-lockfile.js` → pruned pnpm-lock.yaml in dist/
# The standard package target currently requires a source package.json that
# this integrated workspace does not have; see docs/development/legacy-cleanup.md.
#
# Using pnpm (same as the monorepo) avoids npm/pnpm peer-dep mismatch.
# ────────────────────────────────────────────────────────────────────
FROM node:24.14.1-alpine

RUN apk add --no-cache libc6-compat && \
    corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app

ENV NODE_ENV=production
ENV ENGINE_PORT=8000

COPY .npmrc ./
COPY dist/services/engine ./
COPY libs/i18n/src/translations ./libs/i18n/src/translations

RUN pnpm install --frozen-lockfile --prod

EXPOSE 8000
CMD ["node", "main.js"]
