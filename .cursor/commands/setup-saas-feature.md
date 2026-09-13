# Setup SaaS Feature

开始前确认目标端、资源、权限和已有可复用能力。不要默认新增数据表、消息队列或产品事件。

本命令由 Cursor 直接维护，不同步到其他 Agent。它是路由入口，规范唯一源在 .agents/skills，以下路径均相对仓库根目录：

1. 所有业务接口：完整读取 .agents/skills/ray-api-flow/SKILL.md 及其 references/architecture.md。
2. 数据模型/持久化/异步任务：按入口要求读取 references/persistence.md。
3. HTTP：读取 .agents/skills/ray-rest-api-flow/SKILL.md 和 references/http.md。
4. Pulse：读取 .agents/skills/ray-websocket-api-flow/SKILL.md 和 references/protocol.md。
5. 页面与全栈：读取 .agents/skills/ray-module-dev/SKILL.md；Web/Desktop 加载 references/studio.md。
6. 跨运行时选库：读取 .agents/skills/ray-api-flow/references/runtime-libraries.md。

实现顺序：资源权限 → 数据模型/Domain → 共享契约 → DTO/协议验证 → Use Case/CQRS → Infrastructure → Controller/Gateway → Client → 验证。
所有业务读写必须经过 Use Case；仅健康检查和心跳等平台操作可明确豁免。
Model 阶段先决定复用，不要求每个接口建表；迁移只能在已确认隔离环境执行。
Domain 不依赖 Prisma/Nest/HTTP；Use Case 无直接数据库或外部 SDK；依赖绑定在 composition root。
Better Auth 原语不另写认证实现。请求主体不能决定身份/权限/归属。

验收包含真实 HTTP/WS/隔离持久化及内部架构检查，不能以创建测试文件、mock 或 skip 替代通过证据。
此命令不得授权生产迁移、部署、自动升级运行时依赖或删除受支持的框架能力。
