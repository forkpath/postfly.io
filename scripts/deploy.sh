#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker/docker-compose.yml"

APP_SERVICES=(engine web)

cd "$PROJECT_ROOT"

# ── Helpers ──────────────────────────────────────────────────────
info()  { printf '\033[1;34m[INFO]\033[0m  %s\n' "$*"; }
ok()    { printf '\033[1;32m[OK]\033[0m    %s\n' "$*"; }
err()   { printf '\033[1;31m[ERR]\033[0m   %s\n' "$*" >&2; }

ENV_FILE="$PROJECT_ROOT/docker/.env"

dc() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [command]

Commands:
  update    Pull latest code, rebuild app images, restart app services (default)
  build     Build app images only (engine + web)
  up        Start all services (infra is untouched if already running)
  restart   Restart app services only (engine + web)
  down      Stop all services
  logs      Tail logs (pass service name as extra arg, default: engine web)
  status    Show running containers
  migrate   Run Prisma migrations on engine
  infra     Start infrastructure only (redis, postgres, mongo, rabbitmq)

Only 'engine' and 'web' are rebuilt/restarted during updates.
Infrastructure containers (redis, postgres, mongo, rabbitmq, kong, konga)
are never rebuilt or restarted unless you explicitly run 'down' + 'up'.

Examples:
  ./deploy.sh                 # full update cycle (app only)
  ./deploy.sh build           # rebuild app images only
  ./deploy.sh logs engine     # tail engine logs
  ./deploy.sh infra           # start infrastructure (first deploy)
EOF
}

check_env() {
  local env_file="$PROJECT_ROOT/docker/.env"
  if [ ! -f "$env_file" ]; then
    err ".env file not found at $env_file"
    info "Copy from template: cp $PROJECT_ROOT/.env.example $env_file"
    exit 1
  fi
}

# ── Commands ─────────────────────────────────────────────────────
cmd_nx_build() {
  info "Installing dependencies..."
  pnpm install --frozen-lockfile

  # Load VITE_* variables from docker/.env so Vite inlines them at build time.
  # Only export VITE_* lines — sourcing the full .env is unsafe (special chars).
  if [ -f "$ENV_FILE" ]; then
    info "Loading VITE_* variables from $ENV_FILE"
    while IFS= read -r line || [ -n "$line" ]; do
      [[ "$line" =~ ^[[:space:]]*#|^[[:space:]]*$ ]] && continue
      if [[ "$line" =~ ^(VITE_[A-Za-z0-9_]+)=(.*) ]]; then
        export "${BASH_REMATCH[1]}=${BASH_REMATCH[2]}"
      fi
    done < "$ENV_FILE"
  fi

  info "Building web (TanStack Start + Nitro)..."
  NODE_ENV=production pnpm exec nx run web:build

  info "Building engine (webpack)..."
  pnpm exec nx run engine:build

  info "Generating pruned lockfile for engine..."
  node scripts/create-engine-lockfile.js

  ok "Nx builds complete"
}

cmd_build() {
  cmd_nx_build
  info "Packaging app images (engine, web)..."
  dc build --parallel "$@" "${APP_SERVICES[@]}"
  ok "Images built successfully"
}

cmd_infra() {
  check_env
  info "Starting infrastructure services..."
  dc up -d redis postgres mongo rabbitmq
  ok "Infrastructure started"
  dc ps
}

cmd_up() {
  check_env
  info "Starting all services..."
  dc up -d
  ok "All services started"
  cmd_status
}

cmd_restart() {
  check_env
  info "Restarting app services (engine, web)..."
  dc up -d --no-deps --force-recreate "${APP_SERVICES[@]}"
  info "Waiting for app health checks..."
  dc up -d kong konga
  ok "App services restarted"
  cmd_status
}

cmd_down() {
  info "Stopping all services..."
  dc down
  ok "Services stopped (volumes preserved)"
}

cmd_update() {
  check_env

  info "Pulling latest code..."
  git pull --ff-only

  cmd_build

  info "Restarting app services only..."
  dc up -d --no-deps --force-recreate "${APP_SERVICES[@]}"
  info "Ensuring gateway is up..."
  dc up -d kong konga
  ok "Update complete"
  cmd_status
}

cmd_logs() {
  local service="${1:-}"
  if [ -n "$service" ]; then
    dc logs -f "$service"
  else
    dc logs -f "${APP_SERVICES[@]}"
  fi
}

cmd_status() {
  dc ps
}

cmd_migrate() {
  info "Running Prisma migrations..."
  dc exec engine npx prisma migrate deploy
  ok "Migrations complete"
}

# ── Main ─────────────────────────────────────────────────────────
COMMAND="${1:-update}"
shift 2>/dev/null || true

case "$COMMAND" in
  update)   cmd_update ;;
  build)    cmd_build "$@" ;;
  up)       cmd_up ;;
  restart)  cmd_restart ;;
  down)     cmd_down ;;
  infra)    cmd_infra ;;
  logs)     cmd_logs "$@" ;;
  status)   cmd_status ;;
  migrate)  cmd_migrate ;;
  -h|--help|help) usage ;;
  *)
    err "Unknown command: $COMMAND"
    usage
    exit 1
    ;;
esac
