#!/usr/bin/env bash
# 将 .agents/skills 中的 skills 以相对路径软链接同步到 .cursor、.claude、.codex
# 用法: ./scripts/sync-skills.sh 或 pnpm sync:skills
# 提交到 git 后，软链接会随仓库克隆，跨机器可用

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/.agents/skills"
TARGETS=(".cursor" ".claude" ".codex")

if [[ ! -d "$SOURCE" ]]; then
  echo "Error: $SOURCE not found"
  exit 1
fi

count=0
for skill in "$SOURCE"/*; do
  [[ -d "$skill" ]] || continue
  name="$(basename "$skill")"
  for target in "${TARGETS[@]}"; do
    dest="$ROOT/$target/skills/$name"
    if [[ ! -e "$dest" ]] || [[ ! -L "$dest" ]]; then
      mkdir -p "$ROOT/$target/skills"
      ln -sf "../../.agents/skills/$name" "$dest"
      echo "Created $target/skills/$name"
      ((count++)) || true
    fi
  done
done

if [[ $count -eq 0 ]]; then
  echo "All skills already synced."
else
  echo "Synced $count new link(s)."
fi
