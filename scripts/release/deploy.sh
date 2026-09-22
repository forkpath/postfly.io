#!/usr/bin/env bash
# Build/publish happens in CI. This entry uses pinned images on the target host.
set -euo pipefail
ROOT="${DEPLOY_PATH:-$(cd "$(dirname "$0")/../.." && pwd)}"
export RAY_ENV_FILE="${RAY_ENV_FILE:-$ROOT/.env}"
test -f "$RAY_ENV_FILE" || { printf 'Missing environment file: %s\n' "$RAY_ENV_FILE" >&2; exit 1; }

for name in ENGINE_IMAGE PULSE_IMAGE WORKER_IMAGE WEB_IMAGE MIGRATOR_IMAGE; do
  value="${!name:-}"
  [[ "$value" =~ @sha256:[0-9a-f]{64}$ ]] || { printf '%s must be an image digest\n' "$name" >&2; exit 1; }
done
if test -n "${GHCR_TOKEN:-}"; then
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io --username "${GHCR_USER:?GHCR_USER is required}" --password-stdin >/dev/null
fi
compose() {
  docker compose --env-file "$RAY_ENV_FILE" \
    -f "$ROOT/docker/docker-compose.infra.yml" \
    -f "$ROOT/docker/docker-compose.app.yml" "$@"
}
# Stop on migration failure before replacing any application container.
compose pull
compose up -d --wait postgres redis mongo rabbitmq
compose run --rm migrator
compose up -d --wait engine pulse worker web kong
printf 'Services are ready behind Kong.\n'
