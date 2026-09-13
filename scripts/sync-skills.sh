#!/usr/bin/env bash
# 仅同步 Codex/Cursor 的 skills；commands 由 Cursor 直接维护。冲突不覆盖。
set -euo pipefail
TASK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$TASK_ROOT/tools/skills-maintenance/cli.mjs" sync
