# 可执行接口契约（仅评测）

导出 tools/skill-evaluation/src/bootstrap.ts 的 async start(options)，返回
{ url: string, wsUrl: string, close: () => Promise<void> }。
options: { port: number, pool: pg.Pool, auth: Better Auth instance, redisUrl: string, channelNamespace: string }。
使用 Nest application，REST 用 HTTP Controller/CQRS；WS 用 Nest WsAdapter / 原生 ws。
port=0 绑定 127.0.0.1 随机端口。close 关闭 listener/socket/timer/自建 Redis，但不关闭外部 pool。
auth 是真实 Better Auth 实例；从请求 cookie 验证 Session。不会要求自行实现注册登录。
不要在 bootstrap 自动创建业务表；验证器已在隔离 PG 创建：

- evaluation_items(id text PK, owner_user_id text nullable, organization_id text nullable, title text NOT NULL)，两种 owner 恰好一个。
- Better Auth 原生 "user" / "session" / "organization" / "member" 等表；Member 列为 "organizationId"、"userId"、role。
- owner/admin 可组织写，member 只可组织读。平台 admin 不自动获得组织权限。

## REST

个人：/api/v1/evaluation/items；组织：/api/v1/evaluation/organizations/:organizationId/items。
GET 返回 { code:0, msg:'ok', data:{list:[{id,title}],total} }，只返回当前 scope。
POST 接受 {title:string}，trim 后长度 1..100；返回同样 envelope 的 data:{id,title}。不接受客户端 owner 字段。
DELETE 在上述路径追加 /:id，仅删除当前授权 scope 的条目；成功 200/204。
未认证 401；未授权 403 或不泄露资源的 404；非法请求 400。数据库必须真实写入。
测试资源只用于评测，不改变 Ray 公开 API。

## WS

路径 /ws，cookie Session 鉴权，Origin 允许 http://localhost:18080。
请求 JSON: { version:1, id:string, type, payload }，id 为非空字符串。
type:
- subscribe / unsubscribe，payload:{organizationId:string}
- platform.smoke，payload:{organizationId:string,text:string}，text 长度 1..100
响应 ack: {version:1,type:'ack',correlationId:请求id,payload:{...}}
响应 error: {version:1,type:'error',correlationId:请求id,payload:{code:string}}
坏 JSON 等没有合法请求 ID 的错误允许关闭或发送 error。
platform.smoke 仅 owner/admin 发布，必须经过真实 Redis 广播到两实例已授权订阅者：
{version:1,type:'platform.smoke',correlationId:请求id,actor:{userId,organizationId},payload:{text}}。
actor 服务端决定，客户端不能提供；不把 broadcast 当持久队列或新产品事件。
成员撤权/Session 过期后不得继续接收后续事件；重新连接重新鉴权与订阅。
拒绝未知 type/version、超大 frame（上限 64 KiB）；实现 heartbeat、消息/连接限流、背压和退出清理。
