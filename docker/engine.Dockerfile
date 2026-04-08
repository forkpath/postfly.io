# ─── engine: runtime-only image ─────────────────────────────────────
# Build artifacts + pruned lockfile are produced on the host:
#   1. `nx run engine:build`  → dist/services/engine/ (main.js + package.json)
#   2. `node scripts/create-engine-lockfile.js` → pnpm-lock.yaml in dist/
#
# Using pnpm (same as the monorepo) avoids npm/pnpm peer-dep mismatch.
# ────────────────────────────────────────────────────────────────────
FROM node:24-alpine

RUN apk add --no-cache libc6-compat && \
    corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

ENV NODE_ENV=production
ENV ENGINE_PORT=8000

COPY .npmrc ./
COPY dist/services/engine ./
COPY libs/i18n/src/translations ./libs/i18n/src/translations

RUN pnpm install --frozen-lockfile --prod

EXPOSE 8000
CMD ["node", "main.js"]
