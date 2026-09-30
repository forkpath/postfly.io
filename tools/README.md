# 独立执行工具

这里仅保留需要独立依赖环境的两个包。它们不参与业务请求，也不要求新用户手动执行。

| 目录                                 | 用途                                           | 调用入口                                  | 保留原因                                             |
| ------------------------------------ | ---------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- |
| [auth-schema](auth-schema/README.md) | 固定 Better Auth CLI，生成候选认证模型用于比较 | `pnpm nx run auth-server:schema-check`    | 升级认证依赖或调整插件后需要，避免生成器依赖污染应用 |
| [migrator](migrator/README.md)       | 固定 Prisma CLI 的容器运行依赖                 | Migrator 镜像执行 `prisma migrate deploy` | 新环境初始化和下游业务的后续 schema 变更都使用       |

技能链接同步由 `scripts/sync-skills.mjs` 完成，不需要独立 Nx 项目、Agent 评测环境或自动 PR 发布器。
