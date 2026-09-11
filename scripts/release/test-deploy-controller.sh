#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TEST_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/ray-release-controller.XXXXXX")"

cleanup() {
  case "$TEST_ROOT" in
    */ray-release-controller.*) rm -rf -- "$TEST_ROOT" ;;
    *) printf 'refusing to clean unexpected path: %s\n' "$TEST_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT

prepare_root() {
  local root="$1"
  mkdir -p "$root/.release" "$root/docker/kong" "$root/releases/manifests"
  cp "$PROJECT_ROOT/docker/kong/kong.yml" "$root/docker/kong/kong.yml"
  cp "$PROJECT_ROOT/docker/docker-compose.app.yml" "$root/docker/docker-compose.app.yml"
  cp "$PROJECT_ROOT/.release/migration-class" "$root/.release/migration-class"
  printf 'REDIS_PASSWORD=contract-only\n' > "$root/.env"
}

prepare_root "$TEST_ROOT/valid"
printf 'blue\n' > "$TEST_ROOT/valid/releases/active-color"
printf 'release-current\n' > "$TEST_ROOT/valid/releases/color-blue-release"
printf 'release-previous\n' > "$TEST_ROOT/valid/releases/color-green-release"
release_log="$TEST_ROOT/release.log"
: > "$release_log"

PATH="$PROJECT_ROOT/scripts/release/fixtures/bin:$PATH" \
MOCK_RELEASE_LOG="$release_log" \
DEPLOY_PATH="$TEST_ROOT/valid" \
RELEASE_OPERATOR='controller-test' \
ROLLBACK_REASON=$'candidate "health"\nregression' \
ROLLBACK_RTO_TARGET_SECONDS=300 \
  bash "$PROJECT_ROOT/scripts/release/deploy-blue-green.sh" rollback

test "$(tr -d '[:space:]' < "$TEST_ROOT/valid/releases/active-color")" = 'green'
manifest="$(find "$TEST_ROOT/valid/releases/manifests" -maxdepth 1 -type f -name 'rollback-*.json' -print -quit)"
test -n "$manifest" || {
  printf 'rollback manifest was not created\n' >&2
  exit 1
}

node - "$manifest" <<'NODE'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const expected = {
  event: 'rollback',
  mode: 'manual',
  operator: 'controller-test',
  reason: 'candidate "health"\nregression',
  fromColor: 'blue',
  toColor: 'green',
  fromReleaseSha: 'release-current',
  toReleaseSha: 'release-previous',
  rtoTargetSeconds: 300,
  rtoPassed: true
}
for (const [key, value] of Object.entries(expected)) {
  if (manifest[key] !== value) {
    throw new Error(`unexpected rollback manifest ${key}: ${manifest[key]}`)
  }
}
if (!Number.isInteger(manifest.durationSeconds) || manifest.durationSeconds < 0) {
  throw new Error('rollback duration is not a non-negative integer')
}
NODE

start_line="$(rg -n 'docker start ray-engine-green' "$release_log" | cut -d: -f1)"
switch_line="$(rg -n '^curl .*127\.0\.0\.1:8001/config' "$release_log" | cut -d: -f1)"
stop_line="$(rg -n 'docker stop .*ray-engine-blue' "$release_log" | cut -d: -f1)"
test "$start_line" -lt "$switch_line"
test "$switch_line" -lt "$stop_line"

# A post-switch observation failure must atomically restore the prior color,
# stop the candidate and write an automatic rollback event.
prepare_root "$TEST_ROOT/automatic"
printf 'green\n' > "$TEST_ROOT/automatic/releases/active-color"
printf 'release-previous\n' > "$TEST_ROOT/automatic/releases/color-green-release"
: > "$release_log"
digest='sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
if PATH="$PROJECT_ROOT/scripts/release/fixtures/bin:$PATH" \
  MOCK_RELEASE_LOG="$release_log" \
  DEPLOY_PATH="$TEST_ROOT/automatic" \
  ENGINE_IMAGE="example/engine@$digest" \
  WEB_IMAGE="example/web@$digest" \
  PULSE_IMAGE="example/pulse@$digest" \
  WORKER_IMAGE="example/worker@$digest" \
  MIGRATOR_IMAGE="example/migrator@$digest" \
  RELEASE_SHA='release-candidate' \
  RELEASE_OPERATOR='controller-test' \
  BACKUP_CHECK_COMMAND=true \
  RELEASE_GUARD_COMMAND=false \
  SMOKE_EMAIL='smoke@example.test' \
  SMOKE_PASSWORD='not-a-real-secret' \
  POSTGRES_USER='ray' \
  POSTGRES_PASSWORD='contract-only' \
  POSTGRES_DB='ray' \
    bash "$PROJECT_ROOT/scripts/release/deploy-blue-green.sh" deploy; then
  printf 'deployment unexpectedly passed a failing observation guard\n' >&2
  exit 1
fi
test "$(tr -d '[:space:]' < "$TEST_ROOT/automatic/releases/active-color")" = 'green'
automatic_manifest="$(find "$TEST_ROOT/automatic/releases/manifests" -maxdepth 1 -type f -name 'rollback-*.json' -print -quit)"
node - "$automatic_manifest" <<'NODE'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(process.argv[2], 'utf8'))
if (
  manifest.mode !== 'automatic' ||
  manifest.reason !== 'candidate-deploy-failure' ||
  manifest.fromColor !== 'blue' ||
  manifest.toColor !== 'green' ||
  manifest.fromReleaseSha !== 'release-candidate' ||
  manifest.toReleaseSha !== 'release-previous'
) {
  throw new Error(`unexpected automatic rollback: ${JSON.stringify(manifest)}`)
}
NODE
blue_switch_line="$(rg -n '^curl-color blue$' "$release_log" | cut -d: -f1)"
green_switch_line="$(rg -n '^curl-color green$' "$release_log" | cut -d: -f1)"
candidate_stop_line="$(rg -n 'docker stop .*ray-engine-blue' "$release_log" | cut -d: -f1)"
test "$blue_switch_line" -lt "$green_switch_line"
test "$green_switch_line" -lt "$candidate_stop_line"

# Traffic restoration remains successful when the RTO is missed, but the
# command and manifest must fail the release gate.
prepare_root "$TEST_ROOT/rto-miss"
printf 'blue\n' > "$TEST_ROOT/rto-miss/releases/active-color"
printf 'release-current\n' > "$TEST_ROOT/rto-miss/releases/color-blue-release"
printf 'release-previous\n' > "$TEST_ROOT/rto-miss/releases/color-green-release"
: > "$release_log"
if PATH="$PROJECT_ROOT/scripts/release/fixtures/bin:$PATH" \
  MOCK_RELEASE_LOG="$release_log" \
  MOCK_STOP_DELAY_SECONDS=2 \
  DEPLOY_PATH="$TEST_ROOT/rto-miss" \
  RELEASE_OPERATOR='controller-test' \
  ROLLBACK_REASON='forced RTO miss' \
  ROLLBACK_RTO_TARGET_SECONDS=1 \
    bash "$PROJECT_ROOT/scripts/release/deploy-blue-green.sh" rollback; then
  printf 'rollback unexpectedly passed after exceeding its RTO target\n' >&2
  exit 1
fi
test "$(tr -d '[:space:]' < "$TEST_ROOT/rto-miss/releases/active-color")" = 'green'
rto_manifest="$(find "$TEST_ROOT/rto-miss/releases/manifests" -maxdepth 1 -type f -name 'rollback-*.json' -print -quit)"
node - "$rto_manifest" <<'NODE'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(process.argv[2], 'utf8'))
if (manifest.rtoPassed !== false || manifest.durationSeconds < 2) {
  throw new Error(`RTO miss was not recorded: ${JSON.stringify(manifest)}`)
}
NODE

# A missing adoption ledger must fail before any production command runs.
prepare_root "$TEST_ROOT/missing-adoption"
: > "$release_log"
if PATH="$PROJECT_ROOT/scripts/release/fixtures/bin:$PATH" \
  MOCK_RELEASE_LOG="$release_log" \
  DEPLOY_PATH="$TEST_ROOT/missing-adoption" \
  RELEASE_OPERATOR='controller-test' \
  ROLLBACK_REASON='must fail closed' \
    bash "$PROJECT_ROOT/scripts/release/deploy-blue-green.sh" rollback; then
  printf 'rollback unexpectedly accepted a missing active-color ledger\n' >&2
  exit 1
fi
test ! -s "$release_log" || {
  printf 'production command ran before adoption preflight completed\n' >&2
  exit 1
}

# The host controller lock serializes deploy, rollback, and finalize even when
# a workflow or operator bypasses GitHub's production concurrency group.
prepare_root "$TEST_ROOT/concurrent-controller"
printf 'blue\n' > "$TEST_ROOT/concurrent-controller/releases/active-color"
printf 'release-current\n' > "$TEST_ROOT/concurrent-controller/releases/color-blue-release"
printf 'release-previous\n' > "$TEST_ROOT/concurrent-controller/releases/color-green-release"
: > "$release_log"
mkdir "$TEST_ROOT/concurrent-controller/releases/controller.lock"
printf '999999\n' > "$TEST_ROOT/concurrent-controller/releases/controller.lock/pid"
if PATH="$PROJECT_ROOT/scripts/release/fixtures/bin:$PATH" \
  MOCK_RELEASE_LOG="$release_log" \
  DEPLOY_PATH="$TEST_ROOT/concurrent-controller" \
  RELEASE_OPERATOR='controller-test' \
  ROLLBACK_REASON='must serialize' \
    bash "$PROJECT_ROOT/scripts/release/deploy-blue-green.sh" rollback; then
  printf 'controller unexpectedly accepted a concurrent release\n' >&2
  exit 1
fi
test ! -s "$release_log" || {
  printf 'production command ran before controller lock acquisition\n' >&2
  exit 1
}

# Invalid billing rollout order must fail before backup, migration, or Docker.
prepare_root "$TEST_ROOT/invalid-billing-flags"
printf 'blue\n' > "$TEST_ROOT/invalid-billing-flags/releases/active-color"
printf 'release-current\n' > "$TEST_ROOT/invalid-billing-flags/releases/color-blue-release"
printf 'BILLING_OWNER_V2_READ=true\n' >> "$TEST_ROOT/invalid-billing-flags/.env"
: > "$release_log"
if PATH="$PROJECT_ROOT/scripts/release/fixtures/bin:$PATH" \
  MOCK_RELEASE_LOG="$release_log" \
  DEPLOY_PATH="$TEST_ROOT/invalid-billing-flags" \
    bash "$PROJECT_ROOT/scripts/release/deploy-blue-green.sh" deploy; then
  printf 'deployment unexpectedly accepted an invalid billing flag order\n' >&2
  exit 1
fi
test ! -s "$release_log" || {
  printf 'production command ran before billing flag preflight completed\n' >&2
  exit 1
}

# Contract and malformed release intents must fail before backup, migration, or
# Docker. Contract migrations use the separately approved offline workflow.
prepare_root "$TEST_ROOT/contract-migration"
printf 'blue\n' > "$TEST_ROOT/contract-migration/releases/active-color"
printf 'release-current\n' > "$TEST_ROOT/contract-migration/releases/color-blue-release"
printf 'contract\n' > "$TEST_ROOT/contract-migration/.release/migration-class"
: > "$release_log"
if PATH="$PROJECT_ROOT/scripts/release/fixtures/bin:$PATH" \
  MOCK_RELEASE_LOG="$release_log" \
  DEPLOY_PATH="$TEST_ROOT/contract-migration" \
    bash "$PROJECT_ROOT/scripts/release/deploy-blue-green.sh" deploy; then
  printf 'deployment unexpectedly accepted a contract migration intent\n' >&2
  exit 1
fi
test ! -s "$release_log" || {
  printf 'production command ran before migration intent preflight completed\n' >&2
  exit 1
}

# The success manifest must be valid JSON, escape operator input and record the
# exact rollout stage. Source the controller so this test exercises the same
# writer without bypassing the production observation window.
prepare_root "$TEST_ROOT/release-manifest"
release_manifest="$TEST_ROOT/release-manifest/releases/manifests/release-contract.json"
(
  export DEPLOY_PATH="$TEST_ROOT/release-manifest"
  export ENGINE_IMAGE='example/engine@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  export WEB_IMAGE='example/web@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  export PULSE_IMAGE='example/pulse@sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
  export WORKER_IMAGE='example/worker@sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
  export MIGRATOR_IMAGE='example/migrator@sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  export BILLING_OWNER_V2_DUAL_WRITE=true
  export BILLING_OWNER_V2_SHADOW_READ=true
  export BILLING_OWNER_V2_READ=false
  export ORGANIZATION_BILLING_ENABLED=false
  # shellcheck source=deploy-blue-green.sh
  source "$PROJECT_ROOT/scripts/release/deploy-blue-green.sh"
  validate_billing_rollout_flags
  write_release_manifest "$release_manifest" 'release-contract' \
    $'operator "one"\nline two' green blue release-previous \
    '["20260808100000_billing_owner_v2_expand"]' expand \
    '{"policySchemaVersion":1,"mode":"blue-green","expectedClass":"expand","pendingMigrations":[{"id":"20260808100000_billing_owner_v2_expand","class":"expand"}]}'
)
node - "$release_manifest" <<'NODE'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const expectedRollout = {
  dualWrite: true,
  shadowRead: true,
  v2Read: false,
  organizationBilling: false
}
if (manifest.operator !== 'operator "one"\nline two') {
  throw new Error(`release operator was not safely serialized: ${manifest.operator}`)
}
if (JSON.stringify(manifest.billingRollout) !== JSON.stringify(expectedRollout)) {
  throw new Error(`release rollout flags were not recorded: ${JSON.stringify(manifest.billingRollout)}`)
}
if (manifest.migrationIds[0] !== '20260808100000_billing_owner_v2_expand') {
  throw new Error(`release migration IDs were not preserved: ${JSON.stringify(manifest.migrationIds)}`)
}
if (
  manifest.migrationClass !== 'expand' ||
  manifest.migrationPlan.pendingMigrations[0]?.class !== 'expand'
) {
  throw new Error(`release migration plan was not recorded: ${JSON.stringify(manifest.migrationPlan)}`)
}
NODE

printf 'Release controller rollback ordering, manifests, RTO, adoption, billing, and migration-class guards passed.\n'
