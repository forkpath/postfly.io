# HTTP 实施与验收

## 两条通道

Engine 的业务接口在 /api/v1/*。api-client 配置 baseURL=/api/v1，domain wrapper 内路径不重复这个前缀。
Better Auth 在 /api/auth/*，使用 auth-client-web/native；不要复制 Engine 的包装和错误假设。
核验 apps/web 的代理和 Desktop renderer 的 API origin/凭据配置，生产不可依赖 Vite proxy。

Engine controller 返回内层 payload；现有 WrapResInterceptor 生成 { code: 0, msg: 'ok', data: payload }。
api-core 解包，React Query 接收内层 payload。错误由现有过滤器和 ApiError/ApiNetworkError 处理，保持 wire contract。
管理员 guard 只适用管理员动作，不把平台 admin 与组织 owner/admin 混为一谈。

## 共享验证与接线

- 请求和响应 schema 从 @libs/payload public API 导出；协议无关 auth/billing 类型复用对应 contract。
- DTO 用 createZodDto(schema)，真实路由必须安装 ZodValidationPipe。仅写 DTO 类不代表运行时执行了验证。
- query/path/body 都要验证；区分字符串 query 转换和 body 的真实类型。限制分页、排序、字符串长度、未知字段。
- Session 是服务端验证结果；path 组织先授权，body 不允许覆盖 owner。
- Command/Query 携带已验证输入和可信 actor；两类 Handler 都调用 Use Case，Mapper 只序列化。
- Use Case 调用 domain repository interface；基础设施映射真实 ORM 类型，不用任意 Record 或类型断言补洞。
- module 注册 CQRS handlers，用 factory 将仓储 ports 注入无 Nest 的 Use Case。遵循现有异常封装。
- API client 使用现有 createQueryOptionsWithParams/createMutationFactory；请求发送前 parse，query key 包含身份、owner、过滤和分页。
- 写入成功后精确 invalidation；组织切换防止旧异步响应污染新 owner UI。

## 必须验证

1. schema 正反用例、Domain、Use Case 与 Handler 单测。
2. 真实 Nest HTTP listener + DTO + Session 验证 + CQRS + Use Case + 隔离 PG repository，不用 mocked controller 替代。
3. 无会话、过期会话、跨用户/组织、只读角色写操作、非法 body/query/path、所有权篡改、空列表、分页与重复请求。
4. HTTP wire envelope、错误码及 api-client 解包；确认真实 URL 包括 /api/v1。
5. 从验证路径移除 DTO 校验或 owner filter，测试必须失败；仅断言 200 不算验收。
6. 单独执行 Nx lint/typecheck/test 与所需集成 target。测试环境缺失必须非零退出或显式 blocked，不用 skip 算绿。

测试身份只在隔离 DB 中创建；Better Auth email verification 开启时用已验证测试用户/测试 mail adapter。
不要修改原 Engine 以迁就评测；独立测试 composition 只装配所需模块，并明确不代表全部服务启动验收。
