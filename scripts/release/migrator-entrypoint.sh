#!/bin/sh
set -eu

: "${POSTGRES_DATABASE_URL:?POSTGRES_DATABASE_URL is required}"
: "${RELEASE_MIGRATION_CLASS:?RELEASE_MIGRATION_CLASS is required}"

# This check runs inside the same immutable image and against the target
# database immediately before Prisma. Unknown, bootstrap, and contract
# migrations fail before any DDL is executed by this release path.
node /app/scripts/release/check-migration-policy.mjs \
  --mode=blue-green \
  --expected-class="$RELEASE_MIGRATION_CLASS" \
  --migrations-dir=/app/pg-dao/src/migrations \
  --policy=/app/pg-dao/src/migrations/release-policy.json

pnpm --filter @ray/migrator exec prisma migrate deploy \
  --config /app/pg-dao/prisma.config.ts

if test "$RELEASE_MIGRATION_CLASS" = 'expand'; then
  # psql defaults to autocommit, which CREATE INDEX CONCURRENTLY requires.
  # A none release has proved that no migrations are pending and must not run
  # this data-cleanup/index phase as an incidental side effect.
  psql "$POSTGRES_DATABASE_URL" \
    --file /app/scripts/migrations/sql/expand-concurrent-indexes.sql

  # Prove the migration ledger is complete and every required online index is
  # valid before the migrator reports success.
  node /app/scripts/release/check-migration-policy.mjs \
    --mode=blue-green \
    --expected-class=none \
    --migrations-dir=/app/pg-dao/src/migrations \
    --policy=/app/pg-dao/src/migrations/release-policy.json
fi
