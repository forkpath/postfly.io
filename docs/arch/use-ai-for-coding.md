# Ray 开发 Agent

本仓库只支持 **Codex 和 Cursor**。这是开发工具支持范围，不限制产品页面的模型展示或业务模型 provider。

## 共享规范

- 根目录 `AGENTS.md` 是共享仓库规则入口；不维护 Agent 专属的重复根指南。
- `.agents/skills` 是共享 skills 唯一内容源。
- `.codex/skills`、`.cursor/skills` 通过相对软链接指向 canonical 文件。
- `.cursor/commands/*.md` 是 Cursor 自定义命令的唯一源，直接维护真实文件，不做跨 Agent 同步。
- Codex 通过 `AGENTS.md` 和 skills 获取规范，不依赖 commands 目录；例如显式使用 `$ray-api-flow`。
- `.cursor/rules` 只保留必要的路由和文件匹配规则，不复制后端架构教程。

## 修改与验证

修改 skills 时编辑 `.agents/skills` 内的源文件，再在仓库根目录执行：

```sh
pnpm sync:skills
pnpm nx run-many -t lint,test,validate,sync-check -p skills-maintenance
```

`sync:skills` 仅同步两 Agent 的 skills，遇到真实目录、错误软链接或同名冲突立即失败，不自动覆盖。它不修改 Cursor commands，也不创建 commands 目录。
新增命令直接写入 `.cursor/commands/<command-name>.md`，在 Cursor 中输入 `/` 选择；无需同步。
跨 Agent 共用的业务规范仍写入 skills，Cursor command 只负责快捷路由，不能把共享规则迁入 Cursor 专属文件。
Skill 使用 name 和 description 描述用途，复杂细节按需放入 references；不要把其他 Agent 专属的模型、fork 或权限元数据当作跨 Agent 标准。

## 评测与自动维护

有效登录不等于行为验收。两个 Agent 均需在隔离环境实际生成代码并执行测试，证据绑定基线及内容摘要。
历史失败记录保留，预算不清零；已退役 Agent 不再是验收必选项。
操作及未启用的 GitHub 模板见 [维护说明](../../tools/skills-maintenance/README.md)。
