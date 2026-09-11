#!/usr/bin/env bash
set -euo pipefail

: "${POSTGRES_DATABASE_URL:?POSTGRES_DATABASE_URL is required}"

run_stage() {
  local stage="$1"
  local dual_write="$2"
  local shadow_read="$3"
  local v2_read="$4"
  local organization_billing="$5"

  BILLING_OWNER_V2_DUAL_WRITE="$dual_write" \
  BILLING_OWNER_V2_SHADOW_READ="$shadow_read" \
  BILLING_OWNER_V2_READ="$v2_read" \
  ORGANIZATION_BILLING_ENABLED="$organization_billing" \
    pnpm exec tsx tools/migration-tests/src/billing-application-compatibility.ts \
      --stage="$stage"
}

run_stage legacy false false false false
run_stage dual-write true false false false
run_stage shadow-read true true false false
run_stage v2-read true true true false
run_stage organization true true true true

printf 'Billing flags-off, dual-write, shadow-read, V2-read, and organization compatibility passed.\n'
