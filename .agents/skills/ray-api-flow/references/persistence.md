# 数据模型与可靠消息

1. 检查已有模型、索引、关系与真实用例，明确复用决定。没有新增持久状态就不建表。
2. PG 模型位于 libs/pg-dao/src/models；保留已有物理映射、schema 和受控 migrations。不要自动覆盖 auth.prisma。
3. 迁移仅在明确隔离的测试数据库执行。先核验目标 host/database、隔离标记与备份/恢复要求；绝不直接读取根 .env 后执行迁移。
4. 线上变更使用 Expand → Backfill → Switch → Contract；本技能不授权部署或执行生产 DDL。Contract 需要独立窗口与回退门禁。
5. 外部输入经过共享 Zod schema；过滤、排序字段使用显式白名单。SQL 必须参数化，动态标识符只允许服务端固定映射。
6. 映射只做序列化；不能用默认角色/状态掩盖异常数据。写入、计数和查询都带授权后的 scope；事务覆盖需要一起成立的不变量。
7. PG 保存事务型关系状态；Mongo 仅在内容/快照等确有需要时作为附属存储。二者没有共享事务，保存真实引用，设计重试/补偿，不存虚假 pending ID。

## RabbitMQ / Worker 与 WS 分离

RabbitMQ 是异步处理通道，WebSocket 是客户端实时传输；不要把持久任务当成临时 room 广播。
跨进程关键事件需要可靠 outbox/投递记录或明确补偿。发布失败不能静默返回业务成功，除非持久可靠投递已建立。
消息使用版本化契约、messageId、correlationId、必要身份和轻量资源引用，避免秘密和大量内容。
Worker 重新验证任务资源归属，持久 Inbox 以 consumer/messageId 唯一键保证幂等；manual ack、durable queue、限次退避和 DLQ。
未支持版本进入 DLQ/明确失败，不能静默丢弃。副作用与幂等记录必须具备事务或外部幂等键保障。
不要为了展示框架新增真实产品事件。评测资源与 platform smoke event 只能存在隔离 fixture。
