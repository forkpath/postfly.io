# ─── worker: runtime-only image ─────────────────────────────────────
FROM node:24.14.1-alpine

RUN apk add --no-cache libc6-compat && \
    corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app

ENV NODE_ENV=production

COPY .npmrc ./
COPY dist/services/worker ./

RUN pnpm install --frozen-lockfile --prod

CMD ["node", "main.js"]
