# ─── engine: runtime-only image ─────────────────────────────────────
# Build artifacts are produced on the host via `nx run engine:prune`
# which runs: webpack build → prune-lockfile → copy-workspace-modules
#
# dist/services/engine/ contains:
#   main.js              — webpack bundle
#   package.json         — auto-generated external deps only
#   pnpm-lock.yaml       — pruned lockfile
#   workspace_modules/   — workspace package copies
# ────────────────────────────────────────────────────────────────────
FROM node:22-alpine

RUN corepack enable pnpm && corepack prepare pnpm@latest --activate
RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV ENGINE_PORT=8000

COPY dist/services/engine ./
COPY libs/i18n/src/translations ./libs/i18n/src/translations

RUN pnpm install --prod --frozen-lockfile

EXPOSE 8000
CMD ["node", "main.js"]
