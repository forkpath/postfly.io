#!/usr/bin/env bash
# 将 .agents/commands 中的 commands 以相对路径软链接同步到 .cursor、.claude、.codex
# 用法: ./scripts/sync-commands.sh 或 pnpm sync:commands
# 提交到 git 后，软链接会随仓库克隆，跨机器可用

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/.agents/commands"
TARGETS=(".cursor" ".claude" ".codex")

if [[ ! -d "$SOURCE" ]]; then
  echo "Error: $SOURCE not found"
  exit 1
fi

count=0
for cmd in "$SOURCE"/*.md; do
  [[ -f "$cmd" ]] || continue
  name="$(basename "$cmd")"
  for target in "${TARGETS[@]}"; do
    dest="$ROOT/$target/commands/$name"
    if [[ ! -e "$dest" ]] && [[ ! -L "$dest" ]]; then
      mkdir -p "$ROOT/$target/commands"
      ln -sf "../../.agents/commands/$name" "$dest"
      echo "Created $target/commands/$name"
      ((count++)) || true
    fi
  done
done

if [[ $count -eq 0 ]]; then
  echo "All commands already synced."
else
  echo "Synced $count new link(s)."
fi
