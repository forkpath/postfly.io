# Tools · 可复用维护工具与隔离执行包

本目录不是业务应用层。分类以每个子目录 README 为准；没有独立 Nx 项目的目录只标注语义角色，不伪造 tags。

| 工具                                         | 用途/使用者                        | 分类                              | 运行与风险                                    |
| -------------------------------------------- | ---------------------------------- | --------------------------------- | --------------------------------------------- |
| [auth-schema](auth-schema/README.md)         | 认证维护者隔离固定 CLI             | platform/node/auth                | 经 auth-server:schema-check；临时候选，不覆盖 schema |
| [migrator](migrator/README.md)               | 发布维护者提供固定 Prisma 运行环境 | platform/node/platform            | 镜像入口；真实数据库写入                      |
| [migration-tests](migration-tests/README.md) | CI/迁移维护者验证应用与 DB 兼容    | app/node/composition              | Nx 集成测试；仅可丢弃 DB                      |
| [ai-migrations](ai-migrations/README.md)     | 工具链升级者阅读版本迁移指引       | 文档，语义 platform/node/platform | 不可执行，不是生产依赖                        |

所有命令从仓库根运行。普通应用不能导入 tools。工具包不是都带 build/test；查看子目录列出的真实入口。README 不代表已执行迁移或已部署生产。
