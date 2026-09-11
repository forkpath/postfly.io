#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_DATABASE_URL:?POSTGRES_DATABASE_URL is required}"

database_table_count="$(
  psql "$POSTGRES_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc \
    "SELECT COUNT(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema');"
)"

if test "$database_table_count" != '0'; then
  printf 'fresh database verification requires an empty disposable database; found %s user tables\n' \
    "$database_table_count" >&2
  exit 1
fi

pnpm nx run pg-dao:deploy --skipNxCache

# The online index phase is deliberately outside Prisma transactions. Running
# it twice proves normal retry idempotency on the same database version.
psql "$POSTGRES_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  --file scripts/migrations/sql/expand-concurrent-indexes.sql
psql "$POSTGRES_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  --file scripts/migrations/sql/expand-concurrent-indexes.sql

invalid_indexes="$(
  psql "$POSTGRES_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc \
    "SELECT COUNT(*) FROM pg_index AS i JOIN pg_class AS c ON c.oid = i.indexrelid JOIN pg_namespace AS n ON n.oid = c.relnamespace WHERE NOT i.indisvalid AND n.nspname IN ('public', 'billing');"
)"

if test "$invalid_indexes" != '0'; then
  printf 'database verification found %s invalid indexes\n' "$invalid_indexes" >&2
  exit 1
fi

psql "$POSTGRES_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  --file scripts/migrations/preflight.sql
psql "$POSTGRES_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  --file scripts/migrations/preflight-billing-owner-v2.sql

pnpm nx run pg-dao:deploy --skipNxCache

printf 'Fresh database migration and retry verification passed.\n'
