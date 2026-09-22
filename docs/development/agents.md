# 使用 Codex 与 Cursor

仓库支持 Codex 和 Cursor。根 `AGENTS.md` 提供项目结构、公共 API、运行时边界和开发流程；适用目录中的说明进一步补充局部规则。

## 共享技能

`.agents/skills` 是技能内容的唯一来源。`.codex/skills` 与 `.cursor/skills` 通过相对符号链接引用它，修改技能应编辑源目录。

```sh
pnpm sync:skills
pnpm sync:skills:check
```

第一条补齐缺失链接，第二条只检查。遇到同名普通文件、未知条目或指向其他位置的链接时会停止，由维护者核对冲突；同步命令不会覆盖它们。

Cursor 的命令直接在 `.cursor/commands` 维护，不参加技能同步。

## 开发流程

- 查看项目/目标/依赖时先使用 `nx-workspace`；生成项目时使用 `nx-generate`。
- 后端/API 工作先阅读 `ray-api-flow` 及架构参考。HTTP 用 `ray-rest-api-flow`，Pulse 用 `ray-websocket-api-flow`，跨端页面用 `ray-module-dev`。
- Agent 应遵守同样的数据库隔离、测试和代码审查要求。只在独立开发/测试数据库中验证数据写入。
- 外部技能中的示例不改变仓库的技术栈、权限模型或公共入口规则。

技能来源与许可保存在各技能目录及 `.agents/skills/LICENSE.nx.txt`。自动链接检查只验证文件布局；生成的业务代码仍需正常审查和测试。
