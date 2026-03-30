# ─── Stage 1: Base ────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN corepack enable pnpm && corepack prepare pnpm@latest --activate
RUN apk add --no-cache libc6-compat

# ─── Stage 2: Install dependencies ───────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/mobile/package.json apps/mobile/package.json
RUN pnpm install --frozen-lockfile

# ─── Stage 3: Build ──────────────────────────────────────────────
FROM base AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# VITE_* vars are inlined at build time — pass via --build-arg
ARG VITE_PRODUCT_NAME=Ray
ARG VITE_URL=https://ray.example.com
ARG VITE_DEFAULT_LOCALE=en
ARG VITE_THEME_MODE=system
ARG VITE_THEME_COLOR=green
ARG VITE_STRIPE_PUBLISHABLE_KEY=
ARG VITE_BILLING_STRIPE_PRICE_PREMIUM_LIFETIME=
ARG VITE_BILLING_STRIPE_PRICE_PREMIUM_MONTHLY=
ARG VITE_BILLING_STRIPE_PRICE_PREMIUM_YEARLY=

ENV NODE_ENV=production
RUN pnpm exec nx run web:build

# ─── Stage 4: Production ─────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=build /app/apps/web/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
