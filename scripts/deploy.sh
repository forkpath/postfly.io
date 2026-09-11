#!/usr/bin/env bash
set -euo pipefail

# The mutable host-build deployment path was intentionally retired. Production
# releases are built by .github/workflows/deploy.yml and deployed by immutable
# image digest through scripts/release/deploy-blue-green.sh.

COMMAND="${1:-help}"
shift 2>/dev/null || true

fail() {
  printf '[legacy-deploy:error] %s\n' "$*" >&2
  exit 1
}

usage() {
  printf '%s\n' \
    'The legacy git-pull/host-build deployment path is disabled.' \
    '' \
    'Production:' \
    '  1. Merge the accepted release into main.' \
    '  2. Create a production tag from main.' \
    '  3. Let .github/workflows/deploy.yml build and deploy image digests.' \
    '' \
    'Emergency operations on the deployment host:' \
    '  RELEASE_OPERATOR=<identity> ROLLBACK_REASON=<incident> ./scripts/deploy.sh rollback' \
    '  ./scripts/deploy.sh finalize' \
    '' \
    'See docs/arch/deployment.md and docs/migrations/README.md.'
}

case "$COMMAND" in
  rollback|finalize)
    exec "$(dirname "$0")/release/deploy-blue-green.sh" "$COMMAND" "$@"
    ;;
  help|-h|--help)
    usage
    ;;
  update|build|up|restart|migrate|infra|down)
    fail "'$COMMAND' belonged to the retired mutable deployment flow; use the immutable release workflow"
    ;;
  *)
    fail "unknown command '$COMMAND'"
    ;;
esac
