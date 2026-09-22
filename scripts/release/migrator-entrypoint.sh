#!/bin/sh
set -eu

: "${POSTGRES_DATABASE_URL:?POSTGRES_DATABASE_URL is required}"
exec node /app/node_modules/prisma/build/index.js migrate deploy \
  --config /app/pg-dao/prisma.config.ts
