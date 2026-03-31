# ─── web: runtime-only image ────────────────────────────────────────
# Build artifacts are produced on the host via `nx run web:build`
# and then copied into this lightweight image.
#
# TanStack Start + Nitro (node-server preset) bundles everything
# into .output/ — no npm install needed at runtime.
# ────────────────────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY apps/web/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
