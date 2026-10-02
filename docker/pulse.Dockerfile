# Build with pnpm nx run pulse:package; Nx emits the runtime manifest and lockfile.
FROM node:24.14.1-alpine

RUN apk add --no-cache libc6-compat && \
    corepack enable && corepack prepare pnpm@10.34.5 --activate

WORKDIR /app

ENV NODE_ENV=production
ENV PULSE_PORT=3001

COPY dist/services/pulse ./

# Install the standalone Nx runtime graph without workspace-only overrides.
RUN --mount=type=cache,id=ray-runtime-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --ignore-scripts --store-dir=/pnpm/store

EXPOSE 3001
CMD ["node", "main.js"]
