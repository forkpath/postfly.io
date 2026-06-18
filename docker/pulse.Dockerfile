# ─── pulse: runtime-only image ──────────────────────────────────────
FROM node:24-alpine

RUN apk add --no-cache libc6-compat && \
    corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

ENV NODE_ENV=production
ENV PULSE_PORT=3001

COPY .npmrc ./
COPY dist/services/pulse ./

RUN pnpm install --frozen-lockfile --prod

EXPOSE 3001
CMD ["node", "main.js"]
