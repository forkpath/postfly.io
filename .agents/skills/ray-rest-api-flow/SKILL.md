---
name: ray-rest-api-flow
description: 在 Ray 实现或审查 HTTP API、共享 Zod 请求响应、Nest DTO/CQRS、API client query/mutation 和真实 HTTP 验证时使用。仅公共模型/消息设计用 ray-api-flow；WS 传输使用 ray-websocket-api-flow。
---

# Ray REST

先读 ../ray-api-flow/SKILL.md 及其中 architecture.md；持久化变更按其条件读取 persistence.md。
接着读取 [HTTP 实施与验收](references/http.md)。如果需要页面交付，再使用 ray-module-dev。

按公共流程先明确资源/权限和模型复用，再定义共享契约，完成 DTO → Use Case/Handler → Repository → Controller/DI → client。
读取 libs/api-client/src/domains、services/engine/src/application 和 presentation/http 的当前实现作接线参考，但不复制其已知绕过 Use Case 的旧行为。

交付时列出实际 HTTP method/path、鉴权来源、scope、请求/响应 schema、影响的查询缓存和验证命令。
禁止将 Better Auth 的 JSON 强行套用 Engine envelope，禁止借本技能改变现有公开路径。
