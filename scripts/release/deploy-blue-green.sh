#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ROOT="${DEPLOY_PATH:-/opt/ray}"
ENV_FILE="$PROJECT_ROOT/.env"
APP_COMPOSE="$PROJECT_ROOT/docker/docker-compose.app.yml"
KONG_TEMPLATE="$PROJECT_ROOT/docker/kong/kong.yml"
STATE_DIR="$PROJECT_ROOT/releases"
ACTIVE_FILE="$STATE_DIR/active-color"
MIGRATION_CLASS_FILE="$PROJECT_ROOT/.release/migration-class"
COMMAND="${1:-deploy}"

info() { printf '[release] %s\n' "$*"; }
fail() { printf '[release:error] %s\n' "$*" >&2; exit 1; }

json_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  printf '%s' "$value"
}

rollback_rto_target() {
  local target="${ROLLBACK_RTO_TARGET_SECONDS:-300}"
  [[ "$target" =~ ^[1-9][0-9]*$ ]] || \
    fail 'ROLLBACK_RTO_TARGET_SECONDS must be a positive integer'
  printf '%s' "$target"
}

require_digest_reference() {
  local name="$1"
  local reference="$2"
  if [[ ! "$reference" =~ @sha256:[0-9a-f]{64}$ ]]; then
    fail "$name must end in @sha256:<64 lowercase hex characters>"
  fi
}

require_boolean() {
  local name="$1"
  local value="$2"
  case "$value" in
    true|false) ;;
    *) fail "$name must be true or false" ;;
  esac
}

validate_billing_rollout_flags() {
  local dual_write="${BILLING_OWNER_V2_DUAL_WRITE:-false}"
  local shadow_read="${BILLING_OWNER_V2_SHADOW_READ:-false}"
  local v2_read="${BILLING_OWNER_V2_READ:-false}"
  local organization_billing="${ORGANIZATION_BILLING_ENABLED:-false}"

  require_boolean BILLING_OWNER_V2_DUAL_WRITE "$dual_write"
  require_boolean BILLING_OWNER_V2_SHADOW_READ "$shadow_read"
  require_boolean BILLING_OWNER_V2_READ "$v2_read"
  require_boolean ORGANIZATION_BILLING_ENABLED "$organization_billing"

  if test "$shadow_read" = true && test "$dual_write" != true; then
    fail 'BILLING_OWNER_V2_SHADOW_READ requires BILLING_OWNER_V2_DUAL_WRITE=true'
  fi
  if test "$v2_read" = true && test "$shadow_read" != true; then
    fail 'BILLING_OWNER_V2_READ requires BILLING_OWNER_V2_SHADOW_READ=true'
  fi
  if test "$organization_billing" = true && test "$v2_read" != true; then
    fail 'ORGANIZATION_BILLING_ENABLED requires BILLING_OWNER_V2_READ=true'
  fi
}

release_migration_class() {
  test -f "$MIGRATION_CLASS_FILE" || \
    fail "missing immutable release migration intent $MIGRATION_CLASS_FILE"

  local value
  value="$(tr -d '\r\n' < "$MIGRATION_CLASS_FILE")"
  case "$value" in
    none|expand) printf '%s' "$value" ;;
    *)
      fail "blue-green release migration class must be none or expand, found '$value'"
      ;;
  esac
}

test -f "$ENV_FILE" || fail "missing $ENV_FILE"
mkdir -p "$STATE_DIR/manifests"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

active_color() {
  test -f "$ACTIVE_FILE" || \
    fail "missing $ACTIVE_FILE; complete the initial blue-green adoption runbook before deployment"
  local color
  color="$(tr -d '[:space:]' < "$ACTIVE_FILE")"
  case "$color" in
    blue|green) printf '%s' "$color" ;;
    *) fail "invalid active color '$color' in $ACTIVE_FILE" ;;
  esac
}

other_color() {
  if test "$1" = 'blue'; then printf 'green'; else printf 'blue'; fi
}

release_for_color() {
  local file="$STATE_DIR/color-$1-release"
  if test -f "$file"; then
    tr -d '[:space:]' < "$file"
  else
    printf 'unknown'
  fi
}

require_color_available() {
  local color="$1"
  local service
  for service in engine web pulse worker; do
    docker inspect "ray-$service-$color" >/dev/null 2>&1 || \
      fail "rollback prerequisite ray-$service-$color is unavailable"
  done
  wait_color_healthy "$color" || \
    fail "rollback prerequisite color $color is not healthy"
  test "$(release_for_color "$color")" != 'unknown' || \
    fail "missing release pointer for rollback color $color"
}

write_rollback_manifest() {
  local mode="$1"
  local from_color="$2"
  local to_color="$3"
  local from_release="$4"
  local to_release="$5"
  local reason="$6"
  local operator="$7"
  local duration_seconds="$8"
  local target_seconds="$9"
  local passed="${10}"
  local occurred_at file
  occurred_at="$(date -u +%FT%TZ)"
  file="$STATE_DIR/manifests/rollback-$(date -u +%Y%m%dT%H%M%SZ)-${from_color}-to-${to_color}-$$.json"
  printf '{"event":"rollback","mode":"%s","operator":"%s","reason":"%s","fromColor":"%s","toColor":"%s","fromReleaseSha":"%s","toReleaseSha":"%s","durationSeconds":%s,"rtoTargetSeconds":%s,"rtoPassed":%s,"occurredAt":"%s"}\n' \
    "$(json_escape "$mode")" \
    "$(json_escape "$operator")" \
    "$(json_escape "$reason")" \
    "$(json_escape "$from_color")" \
    "$(json_escape "$to_color")" \
    "$(json_escape "$from_release")" \
    "$(json_escape "$to_release")" \
    "$duration_seconds" \
    "$target_seconds" \
    "$passed" \
    "$(json_escape "$occurred_at")" > "$file"
  printf '%s' "$file"
}

render_kong_config() {
  local color="$1"
  local output="$2"
  sed \
    -e "s|\${DOMAIN}|${DOMAIN:-localhost}|g" \
    -e "s|\${ACME_EMAIL}|${ACME_EMAIL:-admin@localhost}|g" \
    -e "s|\${REDIS_PASSWORD}|${REDIS_PASSWORD}|g" \
    -e "s|\${ENGINE_UPSTREAM}|engine-${color}:8000|g" \
    -e "s|\${WEB_UPSTREAM}|web-${color}:3000|g" \
    "$KONG_TEMPLATE" > "$output"
}

switch_kong() {
  local color="$1"
  local config
  config="$(mktemp)"
  render_kong_config "$color" "$config"
  curl --fail --silent --show-error \
    -X POST http://127.0.0.1:8001/config \
    --form "config=@${config}" >/dev/null
  rm -f "$config"
}

wait_healthy() {
  local container="$1"
  local attempts=30
  while test "$attempts" -gt 0; do
    local status
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true)"
    test "$status" = 'healthy' && return 0
    test "$status" = 'unhealthy' && return 1
    attempts=$((attempts - 1))
    sleep 2
  done
  return 1
}

wait_color_healthy() {
  local color="$1"
  wait_healthy "ray-engine-$color"
  wait_healthy "ray-web-$color"
  wait_healthy "ray-pulse-$color"
  wait_healthy "ray-worker-$color"
}

start_color() {
  local color="$1"
  DEPLOY_COLOR="$color" \
  ENGINE_IMAGE="$ENGINE_IMAGE" WEB_IMAGE="$WEB_IMAGE" \
  PULSE_IMAGE="$PULSE_IMAGE" WORKER_IMAGE="$WORKER_IMAGE" \
    docker compose -f "$APP_COMPOSE" --env-file "$ENV_FILE" \
      -p "ray-$color" up -d
  wait_color_healthy "$color"
}

stop_color() {
  local color="$1"
  docker stop --time 60 \
    "ray-engine-$color" \
    "ray-web-$color" \
    "ray-pulse-$color" \
    "ray-worker-$color" >/dev/null
}

start_existing_color() {
  local color="$1"
  docker start \
    "ray-engine-$color" \
    "ray-web-$color" \
    "ray-pulse-$color" \
    "ray-worker-$color" >/dev/null
  wait_color_healthy "$color"
}

observe_candidate() {
  local candidate="$1"
  local observation_seconds="${RELEASE_OBSERVATION_SECONDS:-300}"
  local interval_seconds="${RELEASE_OBSERVATION_INTERVAL_SECONDS:-15}"

  [[ "$observation_seconds" =~ ^[0-9]+$ ]] || fail 'RELEASE_OBSERVATION_SECONDS must be an integer'
  [[ "$interval_seconds" =~ ^[0-9]+$ ]] || fail 'RELEASE_OBSERVATION_INTERVAL_SECONDS must be an integer'
  test "$observation_seconds" -ge 60 || fail 'release observation must be at least 60 seconds'
  test "$interval_seconds" -ge 5 || fail 'release observation interval must be at least 5 seconds'
  : "${RELEASE_GUARD_COMMAND:?RELEASE_GUARD_COMMAND must enforce error-rate, P95 latency, auth-failure, database-connection, and queue-backlog thresholds}"

  local deadline=$((SECONDS + observation_seconds))
  info "observing $candidate for ${observation_seconds}s"
  while test "$SECONDS" -lt "$deadline"; do
    wait_color_healthy "$candidate"
    DEPLOY_CANDIDATE_COLOR="$candidate" \
      DEPLOY_RELEASE_SHA="$RELEASE_SHA" \
      bash -lc "$RELEASE_GUARD_COMMAND"
    sleep "$interval_seconds"
  done
}

write_release_manifest() {
  local file="$1"
  local release_sha="$2"
  local operator="$3"
  local color="$4"
  local previous_color="$5"
  local previous_release="$6"
  local migration_ids="$7"
  local migration_class="$8"
  local migration_plan="$9"
  local deployed_at
  deployed_at="$(date -u +%FT%TZ)"

  printf '{"gitSha":"%s","operator":"%s","color":"%s","previousColor":"%s","previousReleaseSha":"%s","engine":"%s","web":"%s","pulse":"%s","worker":"%s","migrator":"%s","migrationClass":"%s","migrationPlan":%s,"migrationIds":%s,"billingRollout":{"dualWrite":%s,"shadowRead":%s,"v2Read":%s,"organizationBilling":%s},"verification":{"backup":"passed","migration":"passed","readiness":"passed","smoke":"passed","observation":"passed"},"deployedAt":"%s"}\n' \
    "$(json_escape "$release_sha")" \
    "$(json_escape "$operator")" \
    "$(json_escape "$color")" \
    "$(json_escape "$previous_color")" \
    "$(json_escape "$previous_release")" \
    "$(json_escape "$ENGINE_IMAGE")" \
    "$(json_escape "$WEB_IMAGE")" \
    "$(json_escape "$PULSE_IMAGE")" \
    "$(json_escape "$WORKER_IMAGE")" \
    "$(json_escape "$MIGRATOR_IMAGE")" \
    "$(json_escape "$migration_class")" \
    "$migration_plan" \
    "$migration_ids" \
    "${BILLING_OWNER_V2_DUAL_WRITE:-false}" \
    "${BILLING_OWNER_V2_SHADOW_READ:-false}" \
    "${BILLING_OWNER_V2_READ:-false}" \
    "${ORGANIZATION_BILLING_ENABLED:-false}" \
    "$(json_escape "$deployed_at")" > "$file"
}

deploy() {
  validate_billing_rollout_flags

  local migration_class
  migration_class="$(release_migration_class)"

  : "${ENGINE_IMAGE:?ENGINE_IMAGE digest reference is required}"
  : "${WEB_IMAGE:?WEB_IMAGE digest reference is required}"
  : "${PULSE_IMAGE:?PULSE_IMAGE digest reference is required}"
  : "${WORKER_IMAGE:?WORKER_IMAGE digest reference is required}"
  : "${MIGRATOR_IMAGE:?MIGRATOR_IMAGE digest reference is required}"
  : "${RELEASE_SHA:?RELEASE_SHA is required}"
  : "${RELEASE_OPERATOR:?RELEASE_OPERATOR is required}"
  : "${BACKUP_CHECK_COMMAND:?BACKUP_CHECK_COMMAND must verify the latest backup}"

  require_digest_reference ENGINE_IMAGE "$ENGINE_IMAGE"
  require_digest_reference WEB_IMAGE "$WEB_IMAGE"
  require_digest_reference PULSE_IMAGE "$PULSE_IMAGE"
  require_digest_reference WORKER_IMAGE "$WORKER_IMAGE"
  require_digest_reference MIGRATOR_IMAGE "$MIGRATOR_IMAGE"

  local previous previous_release candidate switched candidate_started migration_ids migration_plan rollback_target
  previous="$(active_color)"
  previous_release="$(release_for_color "$previous")"
  candidate="$(other_color "$previous")"
  switched=false
  candidate_started=false
  rollback_target="$(rollback_rto_target)"

  require_color_available "$previous"

  rollback_on_error() {
    local failure_status=$?
    trap - ERR
    if test "$switched" = true; then
      local rollback_started rollback_duration rollback_passed rollback_manifest
      rollback_started="$(date +%s)"
      info "candidate failed after traffic switch; restoring $previous"
      if ! start_existing_color "$previous"; then
        info "automatic rollback could not make $previous healthy; leaving $candidate running for incident response"
        return "$failure_status"
      fi
      docker kill --signal=CONT "ray-pulse-$previous" >/dev/null 2>&1 || true
      if ! switch_kong "$previous"; then
        info "automatic rollback could not switch Kong; leaving $candidate running for incident response"
        return "$failure_status"
      fi
      printf '%s\n' "$previous" > "$ACTIVE_FILE"
      stop_color "$candidate" || true
      rollback_duration="$(($(date +%s) - rollback_started))"
      rollback_passed=true
      test "$rollback_duration" -le "$rollback_target" || rollback_passed=false
      rollback_manifest="$(
        write_rollback_manifest automatic "$candidate" "$previous" \
          "$RELEASE_SHA" "$previous_release" candidate-deploy-failure \
          "$RELEASE_OPERATOR" "$rollback_duration" "$rollback_target" \
          "$rollback_passed"
      )" || true
      info "automatic rollback completed in ${rollback_duration}s; manifest ${rollback_manifest:-unavailable}"
    elif test "$candidate_started" = true; then
      info "candidate failed before traffic switch; stopping $candidate"
      stop_color "$candidate" || true
    fi
    return "$failure_status"
  }
  trap rollback_on_error ERR

  info 'verifying backup status'
  bash -lc "$BACKUP_CHECK_COMMAND"

  info 'pulling immutable image digests'
  if test -n "${GHCR_TOKEN:-}"; then
    printf '%s' "$GHCR_TOKEN" | docker login ghcr.io \
      --username "${GHCR_USER:?GHCR_USER is required with GHCR_TOKEN}" \
      --password-stdin >/dev/null
  fi
  docker pull "$ENGINE_IMAGE"
  docker pull "$WEB_IMAGE"
  docker pull "$PULSE_IMAGE"
  docker pull "$WORKER_IMAGE"
  docker pull "$MIGRATOR_IMAGE"

  info "preflighting $migration_class migrations from the pinned migrator image"
  local database_url
  database_url="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@ray-postgres:5432/${POSTGRES_DB}?connect_timeout=30&sslmode=disable"
  migration_plan="$(
    docker run --rm --network ray-net \
      --entrypoint node \
      --env "POSTGRES_DATABASE_URL=$database_url" \
      --env "RELEASE_MIGRATION_CLASS=$migration_class" \
      "$MIGRATOR_IMAGE" \
      /app/scripts/release/check-migration-policy.mjs \
      --mode=blue-green \
      --expected-class="$migration_class" \
      --migrations-dir=/app/pg-dao/src/migrations \
      --policy=/app/pg-dao/src/migrations/release-policy.json
  )"

  info "running $migration_class migrations from the pinned migrator image"
  docker run --rm --network ray-net \
    --env "POSTGRES_DATABASE_URL=$database_url" \
    --env "RELEASE_MIGRATION_CLASS=$migration_class" \
    "$MIGRATOR_IMAGE"
  migration_ids="$(
    docker run --rm --network ray-net \
      --entrypoint sh \
      --env "POSTGRES_DATABASE_URL=$database_url" \
      "$MIGRATOR_IMAGE" -c \
      'psql "$POSTGRES_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc "SELECT COALESCE(json_agg(migration_name ORDER BY finished_at)::text, '\''[]'\'') FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL"'
  )"

  info "starting candidate color $candidate"
  candidate_started=true
  start_color "$candidate"

  docker exec "ray-engine-$candidate" wget -qO- http://127.0.0.1:8000/api/v1/health >/dev/null
  docker exec "ray-web-$candidate" wget -qO- http://127.0.0.1:3000/ >/dev/null

  : "${SMOKE_EMAIL:?SMOKE_EMAIL is required}"
  : "${SMOKE_PASSWORD:?SMOKE_PASSWORD is required}"
  docker cp "$PROJECT_ROOT/scripts/release/smoke-test.mjs" \
    "ray-engine-$candidate:/tmp/ray-smoke-test.mjs"
  docker exec \
    -e "SMOKE_EMAIL=$SMOKE_EMAIL" \
    -e "SMOKE_PASSWORD=$SMOKE_PASSWORD" \
    -e "SMOKE_ORGANIZATION_ID=${SMOKE_ORGANIZATION_ID:-}" \
    -e "ORGANIZATION_BILLING_ENABLED=${ORGANIZATION_BILLING_ENABLED:-false}" \
    "ray-engine-$candidate" node /tmp/ray-smoke-test.mjs
  docker cp "$PROJECT_ROOT/scripts/release/pulse-smoke-test.mjs" \
    "ray-pulse-$candidate:/tmp/ray-pulse-smoke-test.mjs"
  docker exec \
    -e "ENGINE_SMOKE_BASE_URL=http://engine-${candidate}:8000" \
    -e "SMOKE_EMAIL=$SMOKE_EMAIL" \
    -e "SMOKE_PASSWORD=$SMOKE_PASSWORD" \
    -e "SMOKE_ORGANIZATION_ID=${SMOKE_ORGANIZATION_ID:-}" \
    "ray-pulse-$candidate" node /tmp/ray-pulse-smoke-test.mjs

  info "atomically switching Kong to $candidate"
  switch_kong "$candidate"
  switched=true
  printf '%s\n' "$candidate" > "$ACTIVE_FILE"

  observe_candidate "$candidate"

  # Kong no longer sends new HTTP or WebSocket connections to the old color.
  # Ask Pulse to reconnect established sockets before stopping the old stack.
  # Containers remain restartable from their immutable image references.
  docker kill --signal=HUP "ray-pulse-$previous" >/dev/null 2>&1 || true
  sleep "${RELEASE_WEBSOCKET_DRAIN_SECONDS:-15}"
  stop_color "$previous"

  local manifest="$STATE_DIR/manifests/${RELEASE_SHA}.json"
  write_release_manifest "$manifest" "$RELEASE_SHA" "$RELEASE_OPERATOR" \
    "$candidate" "$previous" "$previous_release" "$migration_ids" \
    "$migration_class" "$migration_plan"
  printf '%s\n' "$RELEASE_SHA" > "$STATE_DIR/color-$candidate-release"
  trap - ERR
  info "release active; previous color $previous is stopped but restartable for rollback"
}

rollback() {
  : "${RELEASE_OPERATOR:?RELEASE_OPERATOR is required for an audited rollback}"
  : "${ROLLBACK_REASON:?ROLLBACK_REASON is required for an audited rollback}"

  local current previous current_release previous_release started_at duration target passed manifest
  current="$(active_color)"
  previous="$(other_color "$current")"
  current_release="$(release_for_color "$current")"
  previous_release="$(release_for_color "$previous")"
  target="$(rollback_rto_target)"
  require_color_available "$previous"
  test "$current_release" != 'unknown' || fail "missing release pointer for active color $current"

  started_at="$(date +%s)"
  info "starting previous color $previous before rollback"
  start_existing_color "$previous"
  docker kill --signal=CONT "ray-pulse-$previous" >/dev/null 2>&1 || true
  switch_kong "$previous"
  printf '%s\n' "$previous" > "$ACTIVE_FILE"
  stop_color "$current"
  duration="$(($(date +%s) - started_at))"
  passed=true
  test "$duration" -le "$target" || passed=false
  manifest="$(
    write_rollback_manifest manual "$current" "$previous" \
      "$current_release" "$previous_release" "$ROLLBACK_REASON" \
      "$RELEASE_OPERATOR" "$duration" "$target" "$passed"
  )"
  info "traffic restored to $previous in ${duration}s; manifest $manifest"
  test "$passed" = true || fail "rollback completed but exceeded ${target}s RTO target"
}

finalize() {
  local current inactive
  current="$(active_color)"
  inactive="$(other_color "$current")"
  stop_color "$inactive"
  info "inactive color $inactive drained and stopped"
}

acquire_release_lock() {
  local lock_directory="$STATE_DIR/controller.lock"
  if ! mkdir "$lock_directory" 2>/dev/null; then
    fail "another controller is running or a stale lock exists at $lock_directory"
  fi
  printf '%s\n' "$$" > "$lock_directory/pid"
  trap 'rm -f "$STATE_DIR/controller.lock/pid"; rmdir "$STATE_DIR/controller.lock" 2>/dev/null || true' EXIT
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  acquire_release_lock
  case "$COMMAND" in
    deploy) deploy ;;
    rollback) rollback ;;
    finalize) finalize ;;
    *) fail "usage: $0 deploy|rollback|finalize" ;;
  esac
fi
