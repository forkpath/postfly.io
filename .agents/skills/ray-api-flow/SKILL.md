---
name: ray-api-flow
description: Ray 公共 API 架构入口；用于资源归属、权限、领域与持久化设计、REST/WS 协议选择，以及跨 HTTP、Pulse、RabbitMQ、Worker 的接口审查。具体 HTTP 实现转 ray-rest-api-flow，实时协议转 ray-websocket-api-flow，页面集成转 ray-module-dev。
---

# Ray API 公共约束

先确认资源、操作者、所属用户或组织、动作与拒绝条件，再决定复用哪些模型、契约和库。信息不足而会改变产品模型、权限或公开 API 时，先问用户，不自行补设 workspace/project 等概念。

## 阅读路由

- 所有业务 API：读取 [架构与所有权](references/architecture.md)。
- 涉及数据或消息：再读 [持久化与可靠消息](references/persistence.md)。
- 选择共享库、跨端或拆库：再读 [运行时与库选择](references/runtime-libraries.md)，用 nx-workspace 查当前图与 public API。
- HTTP：接着使用 ../ray-rest-api-flow/SKILL.md。
- WebSocket：接着使用 ../ray-websocket-api-flow/SKILL.md。
- 页面、导航、跨端组合：接着使用 ../ray-module-dev/SKILL.md。
- 修改 Engine 或 PG 模型前，完整读取本入口和上述架构参考；涉及持久化再读 persistence.md。无需读取任何 Agent 专属 command。

## 实现顺序，不等于导入方向

资源与权限确认 → 数据模型及领域规则 → 共享契约 → DTO/协议校验 → Use Case 与 CQRS Handler → Infrastructure → Controller/Gateway → 客户端 → 验证。

所有业务读写都经过 Handler → Use Case → Repository/Port，简单列表也不例外。
健康检查、心跳等没有业务规则的平台操作可豁免；明确记录理由，不能借此绕过订阅授权。
Domain 和 Use Case 的源码依赖向内；基础设施实现由 composition root 注入。

## 完成门禁

- 列出资源所有权及正反权限用例，验证持久化查询实际包含所有权过滤。
- 契约及 DTO 共用规则，无类型断言绕过验证，无未实现的新公开字段。
- 运行 Nx 相关 lint/typecheck/test；增加内部层次检查，不能只用项目 tags 证明 Clean Architecture。
- 按协议技能执行真实接口验证；mock 单测不等于真实网络/数据库验收。
- 缺环境、登录或依赖时标记 blocked，不能 skip 后声称通过。
- 不凭“没有当前消费者”删除框架扩展、旧 API 或持久化字段；先证明替代并获得范围授权。
