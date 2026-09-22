FROM node:24.14.1-alpine AS dependencies

RUN apk add --no-cache openssl && \
    corepack enable && corepack prepare pnpm@10.34.5 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tools/migrator/package.json ./tools/migrator/package.json
# This tool has no workspace dependencies. Enable lockfile-based deploy only in
# the image's copy of the lockfile, keeping the source workspace configuration intact.
RUN sed -i '/^settings:$/a\  injectWorkspacePackages: true' pnpm-lock.yaml && \
    pnpm --config.inject-workspace-packages=true --filter @ray/migrator \
    deploy --prod --ignore-scripts /runtime

FROM node:24.14.1-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=dependencies /runtime ./

COPY libs/pg-dao/prisma.config.ts ./pg-dao/prisma.config.ts
COPY libs/pg-dao/src/schema.prisma ./pg-dao/src/schema.prisma
COPY libs/pg-dao/src/models ./pg-dao/src/models
COPY libs/pg-dao/src/migrations ./pg-dao/src/migrations
COPY scripts/release/migrator-entrypoint.sh ./scripts/release/migrator-entrypoint.sh

RUN chmod +x ./scripts/release/migrator-entrypoint.sh && \
    node ./node_modules/prisma/build/index.js --version

USER node
ENTRYPOINT ["/app/scripts/release/migrator-entrypoint.sh"]
