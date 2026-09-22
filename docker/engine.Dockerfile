# Build with pnpm nx run engine:package; Nx emits the runtime manifest and lockfile.
FROM node:24.14.1-alpine

RUN apk add --no-cache libc6-compat && \
    corepack enable && corepack prepare pnpm@10.34.5 --activate

WORKDIR /app

ENV NODE_ENV=production
ENV ENGINE_PORT=8000

COPY dist/services/engine ./
COPY libs/i18n/src/translations ./libs/i18n/src/translations

COPY pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

EXPOSE 8000
CMD ["node", "main.js"]
