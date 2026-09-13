# 原生 ws 协议与生命周期

## 设计前确认

记录 handshake URL、允许 Origin、客户端类型、认证方式、消息 envelope、每种动作的权限和 ack/error 语义。
浏览器通常用安全 cookie；原生客户端可用明确支持的 token。禁止 URL query 中长期 secret/token。
使用 Better Auth 验证握手身份与有效期，不信任客户端 userId/role；关闭后不要继续保存敏感会话数据。
持续连接需要重新验证撤销与过期；不能让 cookie cache 或握手结果成为无限期授权凭证。

## 消息

在 universal contract 中定义运行时 Zod schema，不仅是 interface 或 type assertion。
version、type、id、correlationId、payload 均验证；时间、actor 与组织边界按用途约束。
客户端命令与服务端事件分开，服务端 actor 从 Session 推导，不转发客户端声明。
为每个请求定义成功 ack 与可机器识别 error；关联 correlationId，拒绝未知 type/version、坏 JSON、超限 frame。
既有公开协议先调查并记录兼容策略，不以技能升级直接破坏旧客户端。
重连后重新鉴权/订阅；序号、去重、补拉策略按业务可靠性声明，不把 Redis pub/sub 当可回放日志。

## 订阅、撤权和广播

原生 ws 的 room 是服务端连接集合，不是客户端任意字符串。
订阅前检查当前 Member/资源权限；发布者也需要授权。断言跨组织事件不能到达错误连接。
成员退出、被移除、角色变化、会话注销/过期后，及时撤销订阅或断开连接，并规定可测试的最大传播时延。
Redis pub/sub 提供多实例广播；分别维护本地连接，去重与防回环。事件签发来源和 payload 都验证，Redis 消息不是无限可信输入。
私有事件发送前复核当前授权或采用有明确失效时限的授权缓存；测试竞争条件，不只测 subscribe。
Heartbeat、连接/消息限流、maxPayload、bufferedAmount 上限、慢客户端断开、错误处理、定时器清理与 SIGTERM drain 都必须有行为定义。
readiness 检查 Redis、认证依赖及支持的契约版本；不要仅返回固定 true。

## 真实测试门禁

使用真实 ws 客户端连接 Nest WsAdapter listener，两个隔离实例经独立 Redis 广播；Session/成员存于隔离 PG。
覆盖：未认证、有效/过期/撤销 Session、跨组织订阅/发布、成员撤权后不再接收、坏 JSON/未知版本/超大消息、重复 id、ack/error 关联、断连重连与重新授权、慢连接和退出清理。
测试必须等待明确消息/状态与有限超时，不用睡眠后默认成功。
故意移除 WS 授权或撤权检查，验收必须发现消息越权；FakeSocket 单测不能替代 wire tests。
缺 PG/Redis/认证配置则 blocked/失败，禁止降级成单实例内存测试并声称全链路通过。
