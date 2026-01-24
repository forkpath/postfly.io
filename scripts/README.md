# Scripts

此目录包含项目维护和开发所需的实用脚本。

## 可用脚本

| 脚本 | 命令 | 描述 |
|------|------|------|
| `clean.mjs` | `pnpm clean` | 递归清理构建产物、缓存和依赖目录 |

---

## clean.mjs

清理 monorepo 中的构建产物和缓存文件。

### 功能

递归删除以下目录（包括根目录和所有子项目）：

- `node_modules` — 依赖目录
- `dist` — 构建输出
- `.nx` — Nx 缓存
- `.vite` — Vite 缓存
- `.cache` — 通用缓存目录
- `.tanstack` — TanStack 缓存
- `.log` — 日志目录

### 使用方式

```bash
# 执行清理
pnpm clean

# 预览模式（不实际删除，仅显示将要删除的目录）
pnpm clean:dry-run
```

### 注意事项

- 清理后需要重新运行 `pnpm install` 来恢复依赖
- 建议在切换分支或遇到奇怪的构建问题时使用

---

## 添加新脚本

1. 在此目录创建新的脚本文件（推荐使用 `.js` 或 `.ts`）
2. 在 `package.json` 中添加对应的 npm script
3. 更新此 README 文档
