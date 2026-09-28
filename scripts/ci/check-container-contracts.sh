#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
case "${1:-}" in ''|--require-artifacts) ;; *) echo 'Usage: check-container-contracts.sh [--require-artifacts]' >&2; exit 2 ;; esac
for service in engine web pulse worker migrator; do
  docker buildx build --check --file "docker/$service.Dockerfile" .
done
bash -n scripts/release/deploy.sh
sh -n scripts/release/migrator-entrypoint.sh
sh -n docker/kong/entrypoint.sh
node --check scripts/release/smoke-test.mjs
node --check scripts/release/pulse-smoke-test.mjs
node --check scripts/release/framework-smoke.mjs

# Do not read the developer's .env or connect to their infrastructure.
RAY_ENV_FILE="$(mktemp)"
export RAY_ENV_FILE
trap 'rm -f "$RAY_ENV_FILE"' EXIT
export POSTGRES_USER=check POSTGRES_PASSWORD=check POSTGRES_DB=check REDIS_PASSWORD=check
export MONGO_INITDB_ROOT_USERNAME=check MONGO_INITDB_ROOT_PASSWORD=check MONGO_INITDB_DATABASE=check
export RABBITMQ_DEFAULT_USER=check RABBITMQ_DEFAULT_PASSWORD=check
for service in ENGINE WEB PULSE WORKER MIGRATOR; do
  export "${service}_IMAGE=example/ray@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
done
docker compose --env-file "$RAY_ENV_FILE" -f docker/docker-compose.infra.yml -f docker/docker-compose.app.yml config --quiet
docker compose --env-file "$RAY_ENV_FILE" -f docker/docker-compose.dev.yml config --quiet
if test "${1:-}" = --require-artifacts; then
  for service in engine pulse worker; do
    for file in main.js package.json pnpm-lock.yaml; do
      test -f "dist/services/$service/$file" || { echo "Missing $service/$file" >&2; exit 1; }
    done
  done
  test -f apps/web/.output/server/index.mjs
fi
printf 'Container configuration checks passed.\n'
