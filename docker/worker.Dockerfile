# Build with pnpm nx run worker:package; Nx emits the runtime manifest and lockfile.
FROM node:24.14.1-alpine

RUN apk add --no-cache libc6-compat && \
    corepack enable && corepack prepare pnpm@10.34.5 --activate

WORKDIR /app

ENV NODE_ENV=production

COPY dist/services/worker ./

COPY pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

CMD ["node", "main.js"]
