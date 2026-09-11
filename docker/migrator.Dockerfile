FROM node:24.14.1-alpine

RUN apk add --no-cache openssl postgresql-client && \
    corepack enable && corepack prepare pnpm@10.25.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tools/migrator/package.json ./tools/migrator/package.json
RUN pnpm install --filter @ray/migrator --prod --frozen-lockfile --ignore-scripts

COPY libs/pg-dao/prisma.config.ts ./pg-dao/prisma.config.ts
COPY libs/pg-dao/src/schema.prisma ./pg-dao/src/schema.prisma
COPY libs/pg-dao/src/models ./pg-dao/src/models
COPY libs/pg-dao/src/migrations ./pg-dao/src/migrations
COPY scripts/migrations/sql/expand-concurrent-indexes.sql ./scripts/migrations/sql/expand-concurrent-indexes.sql
COPY scripts/release/check-migration-policy.mjs ./scripts/release/check-migration-policy.mjs
COPY scripts/release/migration-policy.mjs ./scripts/release/migration-policy.mjs
COPY scripts/release/migrator-entrypoint.sh ./scripts/release/migrator-entrypoint.sh

RUN chmod +x ./scripts/release/migrator-entrypoint.sh

USER node
ENTRYPOINT ["/app/scripts/release/migrator-entrypoint.sh"]
