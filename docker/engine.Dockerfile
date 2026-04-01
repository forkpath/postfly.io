# ─── engine: runtime-only image ─────────────────────────────────────
# Build artifacts are produced on the host via `nx run engine:build`
# (webpack with NxAppWebpackPlugin, target: 'node').
#
# Webpack externalizes node_modules by default for node targets.
# generatePackageJson: true creates a package.json listing externals.
# ────────────────────────────────────────────────────────────────────
FROM node:22-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV ENGINE_PORT=8000

COPY dist/services/engine ./
COPY libs/i18n/src/translations ./libs/i18n/src/translations

RUN npm install --omit=dev

EXPOSE 8000
CMD ["node", "main.js"]
