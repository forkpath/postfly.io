# ─── engine: runtime-only image ─────────────────────────────────────
# Build artifacts are produced on the host via `nx run engine:build`
# (webpack with externalDependencies: 'none' bundles everything).
#
# dist/services/engine/ contains:
#   main.js   — self-contained webpack bundle (all deps included)
# ────────────────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV ENGINE_PORT=8000

COPY dist/services/engine/main.js ./
COPY libs/i18n/src/translations ./libs/i18n/src/translations

EXPOSE 8000
CMD ["node", "main.js"]
