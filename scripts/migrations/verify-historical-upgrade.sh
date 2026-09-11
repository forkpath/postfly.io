#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_DATABASE_URL:?POSTGRES_DATABASE_URL is required}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

fail() {
  printf 'historical migration verification failed: %s\n' "$*" >&2
  exit 1
}

run_psql() {
  if command -v psql >/dev/null 2>&1; then
    command psql "$POSTGRES_DATABASE_URL" "$@"
    return
  fi

  if test -n "${POSTGRES_CLIENT_CONTAINER:-}"; then
    : "${POSTGRES_CLIENT_DATABASE_URL:?POSTGRES_CLIENT_DATABASE_URL is required when POSTGRES_CLIENT_CONTAINER is set}"
    docker exec --interactive \
      --workdir "${POSTGRES_CLIENT_WORKDIR:-$PROJECT_ROOT}" \
      "$POSTGRES_CLIENT_CONTAINER" \
      psql "$POSTGRES_CLIENT_DATABASE_URL" "$@"
    return
  fi

  fail 'psql is required; install postgresql-client or set POSTGRES_CLIENT_CONTAINER and POSTGRES_CLIENT_DATABASE_URL'
}

query_scalar() {
  run_psql -X -v ON_ERROR_STOP=1 -Atc "$1"
}

assert_scalar() {
  local expected="$1"
  local query="$2"
  local description="$3"
  local actual
  actual="$(query_scalar "$query")"
  test "$actual" = "$expected" || fail "$description (expected $expected, got $actual)"
}

database_table_count="$(
  query_scalar \
    "SELECT COUNT(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema');"
)"
test "$database_table_count" = '0' || \
  fail "an empty disposable database is required; found $database_table_count user tables"

baseline_migrations=(
  20260119095150_init_auth
  20260317031805_init
  20260326133048_change_schema
  20260326144529_update_schema
  20260327122503_add_webhook_event
)

for migration in "${baseline_migrations[@]}"; do
  printf '[historical-upgrade] applying baseline %s\n' "$migration"
  run_psql -X -v ON_ERROR_STOP=1 \
    --file "libs/pg-dao/src/migrations/$migration/migration.sql"
  pnpm exec prisma migrate resolve \
    --config "$PROJECT_ROOT/libs/pg-dao/prisma.config.ts" \
    --applied "$migration"
done

run_psql -X -v ON_ERROR_STOP=1 \
  --file scripts/migrations/fixtures/pre-expand-data.sql

# Conflicting authorization rows must fail closed before duplicate cleanup.
# The first expand migration may remain applied, but the Billing Owner V2
# migration must be marked failed and all conflicting rows must remain intact.
if pnpm nx run pg-dao:deploy --skipNxCache; then
  fail 'Billing Owner V2 Expand must reject conflicting authorization rows'
fi
assert_scalar '3' \
  "SELECT COUNT(*) FROM public.member WHERE organization_id = 'history-org' AND user_id = 'history-user-a';" \
  'failed conflict guard must not delete membership rows'
assert_scalar '3' \
  "SELECT COUNT(*) FROM public.organization_role WHERE organization_id = 'history-org' AND role = 'billing-admin';" \
  'failed conflict guard must not delete organization-role rows'
assert_scalar '1' \
  "SELECT COUNT(*) FROM public._prisma_migrations WHERE migration_name = '20260808100000_billing_owner_v2_expand' AND finished_at IS NULL AND rolled_back_at IS NULL;" \
  'conflicting Expand migration must be recorded as failed'

# This deletion represents an operator-reviewed conflict decision. The test
# does not infer or merge permissions; it only proves the documented retry.
run_psql -X -v ON_ERROR_STOP=1 -c \
  "DELETE FROM public.member WHERE id = 'history-member-conflict'; DELETE FROM public.organization_role WHERE id = 'history-role-conflict';"
pnpm exec prisma migrate resolve \
  --config "$PROJECT_ROOT/libs/pg-dao/prisma.config.ts" \
  --rolled-back 20260808100000_billing_owner_v2_expand

# Prisma now sees a production-like migration ledger and applies only the
# resolved Billing Owner V2 and Worker Inbox expand migrations.
pnpm nx run pg-dao:deploy --skipNxCache

assert_scalar '8' \
  "SELECT COUNT(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL;" \
  'all migration records must be applied'
assert_scalar '2' \
  'SELECT COUNT(*) FROM billing.customer WHERE user_id IS NULL AND organization_id IS NULL;' \
  'Expand must not guess legacy customer ownership'
assert_scalar '0' \
  'SELECT COUNT(*) FROM (SELECT organization_id, user_id FROM public.member GROUP BY organization_id, user_id HAVING COUNT(*) > 1) AS duplicates;' \
  'equal membership duplicates must be cleaned'
assert_scalar '1' \
  "SELECT COUNT(*) FROM public.member WHERE id = 'history-member-old';" \
  'the oldest equal membership must be retained'
assert_scalar '0' \
  'SELECT COUNT(*) FROM (SELECT organization_id, role FROM public.organization_role GROUP BY organization_id, role HAVING COUNT(*) > 1) AS duplicates;' \
  'equal organization-role duplicates must be cleaned'
assert_scalar '1' \
  "SELECT COUNT(*) FROM public.organization_role WHERE id = 'history-role-old';" \
  'the oldest equal organization role must be retained'
assert_scalar '0' \
  'SELECT COUNT(*) FROM billing.webhook_event WHERE received_at IS NULL OR last_attempt_at IS NULL OR attempt_count < 1;' \
  'legacy webhook retry metadata must be populated'
assert_scalar '2' \
  "SELECT COUNT(*) FROM pg_constraint WHERE conrelid = 'billing.customer'::regclass AND conname IN ('customer_user_id_fkey', 'customer_organization_id_fkey') AND NOT convalidated;" \
  'owner foreign keys must remain NOT VALID during Expand'

# Online indexes live outside Prisma transactions. Running twice proves the
# normal retry path and validates the duplicate cleanup against real old rows.
run_psql -X -v ON_ERROR_STOP=1 \
  --file scripts/migrations/sql/expand-concurrent-indexes.sql
run_psql -X -v ON_ERROR_STOP=1 \
  --file scripts/migrations/sql/expand-concurrent-indexes.sql
assert_scalar '0' \
  "SELECT COUNT(*) FROM pg_index AS i JOIN pg_class AS c ON c.oid = i.indexrelid JOIN pg_namespace AS n ON n.oid = c.relnamespace WHERE NOT i.indisvalid AND n.nspname IN ('public', 'billing');" \
  'online index phase must leave no invalid indexes'

# Run the dual-compatible application against this real historical Expand
# database in the exact rollout order. Every stage is a fresh process so env
# validation and static flag loading match a production instance restart.
bash scripts/migrations/verify-billing-application-compatibility.sh

# This insert represents the previous application image writing after Expand.
run_psql -X -v ON_ERROR_STOP=1 -c \
  "INSERT INTO billing.customer (id, reference_id, provider, external_id, created_at, updated_at) VALUES ('history-customer-old-app', 'history-user-a', 'superwall', 'superwall-history-user-a', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);"

test_directory="$(mktemp -d "${TMPDIR:-/tmp}/ray-history.XXXXXX")"
cleanup() {
  case "$test_directory" in
    */ray-history.*) rm -rf -- "$test_directory" ;;
    *) fail "refusing to clean unexpected temporary path: $test_directory" ;;
  esac
}
trap cleanup EXIT
quarantine_report="$test_directory/quarantine.jsonl"

# Unknown ownership must fail closed and remain unmodified.
run_psql -X -v ON_ERROR_STOP=1 -c \
  "INSERT INTO billing.customer (id, reference_id, provider, external_id, created_at, updated_at) VALUES ('history-customer-unknown', 'missing-history-user', 'stripe', 'stripe-missing-history-user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);"
if pnpm nx run pg-dao:backfill-billing-owner --skipNxCache -- \
  --batch-size=10 --report="$quarantine_report"; then
  fail 'backfill must stop when an owner cannot be identified'
fi
test -f "$quarantine_report" || fail 'backfill quarantine report was not created'
rg -F 'history-customer-unknown' "$quarantine_report" >/dev/null || \
  fail 'quarantine report does not identify the unresolved customer'
assert_scalar '1' \
  "SELECT COUNT(*) FROM billing.customer WHERE id = 'history-customer-unknown' AND user_id IS NULL AND organization_id IS NULL;" \
  'dry-run quarantine must not mutate unresolved ownership'
run_psql -X -v ON_ERROR_STOP=1 -c \
  "DELETE FROM billing.customer WHERE id = 'history-customer-unknown';"

# Simulate a stopped run after one committed batch, then resume idempotently.
run_psql -X -v ON_ERROR_STOP=1 -c \
  "UPDATE billing.customer SET user_id = reference_id WHERE id = 'history-customer-revenuecat';"
pnpm nx run pg-dao:backfill-billing-owner --skipNxCache -- \
  --apply --batch-size=1 --report="$quarantine_report"

assert_scalar '0' \
  'SELECT COUNT(*) FROM billing.customer WHERE user_id IS NULL AND organization_id IS NULL;' \
  'resumed backfill must populate every known owner'
assert_scalar '0' \
  'SELECT COUNT(*) FROM billing.customer WHERE user_id IS NOT NULL AND organization_id IS NOT NULL;' \
  'backfill must never create dual ownership'
assert_scalar '4' \
  'SELECT COUNT(*) FROM billing.customer WHERE user_id = reference_id AND organization_id IS NULL;' \
  'legacy reference and explicit user owner must remain compatible'

run_psql -X -v ON_ERROR_STOP=1 \
  --file scripts/migrations/preflight.sql
run_psql -X -v ON_ERROR_STOP=1 \
  --file scripts/migrations/preflight-billing-owner-v2.sql
pnpm nx run pg-dao:deploy --skipNxCache

printf 'Historical schema upgrade, fail-closed quarantine, and resumable backfill verification passed.\n'
