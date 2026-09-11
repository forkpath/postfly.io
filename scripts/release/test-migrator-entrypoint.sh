#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FIXTURE_BIN="$PROJECT_ROOT/scripts/release/fixtures/migrator-bin"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/ray-migrator-entrypoint.XXXXXX")"
LOG_FILE="$TEST_ROOT/migrator.log"

cleanup() {
  case "$TEST_ROOT" in
    */ray-migrator-entrypoint.*) rm -rf -- "$TEST_ROOT" ;;
    *) printf 'refusing to clean unexpected path: %s\n' "$TEST_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT

run_entrypoint() {
  local migration_class="$1"
  : > "$LOG_FILE"
  PATH="$FIXTURE_BIN:$PATH" \
  MOCK_MIGRATOR_LOG="$LOG_FILE" \
  POSTGRES_DATABASE_URL='postgresql://contract-only' \
  RELEASE_MIGRATION_CLASS="$migration_class" \
    sh "$PROJECT_ROOT/scripts/release/migrator-entrypoint.sh"
}

run_entrypoint none
none_node_line="$(rg -n '^node ' "$LOG_FILE" | cut -d: -f1)"
none_prisma_line="$(rg -n '^pnpm ' "$LOG_FILE" | cut -d: -f1)"
test "$(rg -c '^node ' "$LOG_FILE")" = '1'
test "$none_node_line" -lt "$none_prisma_line"
if rg -q '^psql ' "$LOG_FILE"; then
  printf 'none release unexpectedly ran the online index phase\n' >&2
  exit 1
fi

run_entrypoint expand
expand_node_line="$(rg -n '^node ' "$LOG_FILE" | head -n 1 | cut -d: -f1)"
expand_verify_line="$(rg -n '^node ' "$LOG_FILE" | tail -n 1 | cut -d: -f1)"
expand_prisma_line="$(rg -n '^pnpm ' "$LOG_FILE" | cut -d: -f1)"
expand_psql_line="$(rg -n '^psql ' "$LOG_FILE" | cut -d: -f1)"
test "$(rg -c '^node ' "$LOG_FILE")" = '2'
test "$expand_node_line" -lt "$expand_prisma_line"
test "$expand_prisma_line" -lt "$expand_psql_line"
test "$expand_psql_line" -lt "$expand_verify_line"

: > "$LOG_FILE"
if PATH="$FIXTURE_BIN:$PATH" \
  MOCK_MIGRATOR_LOG="$LOG_FILE" \
  POSTGRES_DATABASE_URL='postgresql://contract-only' \
    sh "$PROJECT_ROOT/scripts/release/migrator-entrypoint.sh"; then
  printf 'migrator unexpectedly accepted a missing migration class\n' >&2
  exit 1
fi
test ! -s "$LOG_FILE"

printf 'Migrator policy-before-Prisma ordering and none/expand side-effect guards passed.\n'
