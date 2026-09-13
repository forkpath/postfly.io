---
name: ray-websocket-api-flow
description: 在 Ray Pulse 设计、实现或审查原生 ws/WebSocket 协议、Better Auth 握手、组织订阅、连接生命周期及真实网络测试时使用。不用于 Socket.IO 或 RabbitMQ Worker 任务实现。
---

# Ray WebSocket

先读 ../ray-api-flow/SKILL.md 与 architecture.md；有持久状态/可靠消息时再读 persistence.md。
再读 [协议与连接验收](references/protocol.md)。

当前 Pulse 用 Nest WsAdapter 与原生 ws；不要使用 Socket.IO 的 rooms/Redis adapter 示例。
订阅是带权限的业务动作，经过 Handler → Use Case → authorization/repository port；仅 ping/pong、无业务规则健康检查豁免。
跨服务复用契约/业务能力通过合法 library public API 或服务接口，不直接 import Engine 源文件。
现有 Pulse 的 mock tests、弱消息校验、只在订阅时验证成员身份是整改项，不是可复制标准。
