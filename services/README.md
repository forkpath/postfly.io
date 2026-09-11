# Node 服务

本目录为分类容器，本身不是可执行 Nx 项目，无独立 type/runtime/domain 或环境变量。各项的实际 tags、消费者、配置、运行、单元测试及适用的 E2E 方法见其 README；不要从目录名推断 runtime。

| 项目                       | type / runtime / domain                      | 用途                                                                                                                                              | 当前标准单元测试              |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| [engine](engine/README.md) | type:app / runtime:node / domain:composition | Nest HTTP API 组合根：认证接入、用户/组织管理、计费、存储；采用 controller → command/query → use case → domain repository → infrastructure 分层。 | 有 target；覆盖范围见项目手册 |
| [pulse](pulse/README.md)   | type:app / runtime:node / domain:composition | Nest WebSocket 服务：Session/token 握手、组织成员校验、Redis 广播、心跳与限流/缓冲控制、readiness。只含平台 smoke 事件。                          | 有 target；覆盖范围见项目手册 |
| [worker](worker/README.md) | type:app / runtime:node / domain:composition | Nest 后台 RabbitMQ 消费应用（并非 Next.js）：版本化 handler registry、PG Inbox claim/幂等、重试/DLQ 与健康端点，现阶段只注册 platform.smoke。     | 有 target；覆盖范围见项目手册 |

从根执行 `pnpm nx show project <name> --json` 确认运行目标，开发入口和环境加载见[根 README](../README.md)。有测试目标不代表所有功能有单测；现有 smoke/构建也不代表 E2E 完整。新增项目时同步本索引。
