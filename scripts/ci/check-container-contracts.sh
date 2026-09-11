#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REQUIRE_ARTIFACTS=false

if test "${1:-}" = '--require-artifacts'; then
  REQUIRE_ARTIFACTS=true
elif test "$#" -ne 0; then
  printf 'usage: %s [--require-artifacts]\n' "$0" >&2
  exit 2
fi

cd "$PROJECT_ROOT"

command -v docker >/dev/null 2>&1 || {
  printf 'docker is required to validate container contracts\n' >&2
  exit 1
}

docker buildx version >/dev/null

dockerfiles=(
  docker/engine.Dockerfile
  docker/web.Dockerfile
  docker/pulse.Dockerfile
  docker/worker.Dockerfile
  docker/migrator.Dockerfile
)

for dockerfile in "${dockerfiles[@]}"; do
  test -f "$dockerfile" || {
    printf 'missing Dockerfile: %s\n' "$dockerfile" >&2
    exit 1
  }
  printf '[container-contract] checking %s\n' "$dockerfile"
  docker buildx build --check --file "$dockerfile" .
done

bash -n scripts/release/deploy-blue-green.sh
sh -n scripts/release/migrator-entrypoint.sh
sh -n docker/kong/entrypoint.sh
node --check scripts/release/check-migration-policy.mjs
node --check scripts/release/migration-policy.mjs
node --check scripts/release/smoke-test.mjs
node --check scripts/release/pulse-smoke-test.mjs
node --test scripts/release/migration-policy.test.mjs
node scripts/release/check-migration-policy.mjs --mode=static
bash scripts/release/test-migrator-entrypoint.sh
bash scripts/release/test-deploy-controller.sh

# Validate both Compose models without resolving the production .env file.
# Required image references are still interpolated to digest-shaped values so
# accidental removal or renaming of a deployment variable fails this check.
DEPLOY_COLOR=blue \
ENGINE_IMAGE='ghcr.io/example/ray-engine@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' \
WEB_IMAGE='ghcr.io/example/ray-web@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' \
PULSE_IMAGE='ghcr.io/example/ray-pulse@sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' \
WORKER_IMAGE='ghcr.io/example/ray-worker@sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd' \
POSTGRES_USER=ray \
POSTGRES_PASSWORD=contract-only \
POSTGRES_DB=ray \
RABBITMQ_DEFAULT_USER=ray \
RABBITMQ_DEFAULT_PASSWORD=contract-only \
  docker compose --file docker/docker-compose.app.yml \
    config --no-env-resolution --quiet

POSTGRES_USER=ray \
POSTGRES_PASSWORD=contract-only \
POSTGRES_DB=ray \
REDIS_PASSWORD=contract-only \
MONGO_INITDB_ROOT_USERNAME=ray \
MONGO_INITDB_ROOT_PASSWORD=contract-only \
MONGO_INITDB_DATABASE=ray \
RABBITMQ_DEFAULT_USER=ray \
RABBITMQ_DEFAULT_PASSWORD=contract-only \
  docker compose --file docker/docker-compose.infra.yml config --quiet

POSTGRES_USER=ray \
POSTGRES_PASSWORD=contract-only \
POSTGRES_DB=ray \
REDIS_PASSWORD=contract-only \
MONGO_INITDB_ROOT_USERNAME=ray \
MONGO_INITDB_ROOT_PASSWORD=contract-only \
MONGO_INITDB_DATABASE=ray \
RABBITMQ_DEFAULT_USER=ray \
RABBITMQ_DEFAULT_PASSWORD=contract-only \
  docker compose --file docker/docker-compose.dev.yml config --quiet

if test "$REQUIRE_ARTIFACTS" = true; then
  artifacts=(
    dist/services/engine/main.js
    dist/services/engine/package.json
    dist/services/engine/pnpm-lock.yaml
    dist/services/pulse/main.js
    dist/services/pulse/package.json
    dist/services/pulse/pnpm-lock.yaml
    dist/services/worker/main.js
    dist/services/worker/package.json
    dist/services/worker/pnpm-lock.yaml
    apps/web/.output/server/index.mjs
  )

  for artifact in "${artifacts[@]}"; do
    test -f "$artifact" || {
      printf 'missing packaged runtime artifact: %s\n' "$artifact" >&2
      exit 1
    }
  done
fi

printf '[container-contract] all checks passed\n'
