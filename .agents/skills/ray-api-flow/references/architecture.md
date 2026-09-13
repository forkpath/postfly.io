# 架构、身份与所有权

## 先写权限表

每个动作记录：资源、会话身份、个人/组织归属、允许角色、查询过滤、失败结果。
身份只来自服务端验证过的 Better Auth Session；请求 path 中 organizationId 只是待验证选择，不是授权。
activeOrganizationId 同样需要当前成员关系验证。不要信任 body 中 ownerId、userId、角色。
个人数据按现有模型的用户列过滤；组织数据按 organizationId 与成员权限过滤。不要假定所有表都有 ownerUserId 或可空 organizationId。
读、写、计数、分页、关联资源、批量操作均执行相同的归属边界。跨组织 ID 必须拒绝或返回不泄露存在性的结果。
成员可读并不意味着可写；组织计费写操作需要 owner/admin。RevenueCat 仍只支持个人归属。
客户端 Query Key 包含当前用户身份及 owner kind/ID；登出、组织切换时取消旧请求、隔离/清理缓存。

## 源码依赖

| 层 | 职责 | 禁止 |
| --- | --- | --- |
| domain | 有行为的实体、实际使用的值对象、纯规则、仓储接口、领域错误 | Prisma、Nest、HTTP DTO、payload、infrastructure |
| application/use-cases | 编排领域行为、验证归属、调用仓储/外部服务 port | Nest 装饰器、数据库、外部 SDK、presentation |
| application/commands 与 queries | CQRS 入口，调用 Use Case；输入/响应映射 | 直接仓储 IO、复制业务规则 |
| infrastructure | 实现 domain ports；持久化、SDK、事务细节 | presentation、让 ORM 类型泄露进 domain |
| presentation | Session、DTO/协议验证、dispatch、传输错误映射 | 数据库、业务规则、直接仓储 |

Use Case 由 Nest module 用 factory 注入，或按现有可验证的 composition 方式装配。
module 可以导入 infrastructure 用于绑定；controller/gateway 不可以借 module 的豁免直接访问数据库。
领域对象不只是把 ORM 记录换个名字；值对象应在实体/接口中实际使用，而不是创建后丢弃。
现有领域错误可能携带 httpStatus 等兼容字段；新领域规则使用传输无关错误码，边界映射 HTTP/WS，不在本轮批量改变旧 API。

Better Auth 管理登录、注册、Session、账户关联、验证、2FA 和组织成员原语；不另写一套认证。
领域模型必须与当前受控 schema 对齐，基础设施负责 Better Auth 适配。

## 验证

单测覆盖授权拒绝、领域状态转换、Use Case 对 port 的调用。
架构测试解析静态 import/export、动态 import、require，并解析别名/相对路径；禁止 barrel 重导出绕过层次。
实际业务路径应验证 Handler 调用了 Use Case，不能用空类/文件名通过检查。
故意引入 domain→Prisma、Use Case→仓储实现及 Handler→数据库依赖时，检查必须失败。
