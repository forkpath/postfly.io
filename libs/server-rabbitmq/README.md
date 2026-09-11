# server-rabbitmq

## 用途

Nest RabbitMQ 连接模块、消息发布服务和 platform exchange/重试队列配置。

## Tags、使用者与场景

`type:platform` · `runtime:node` · `domain:platform`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

Engine 发布轻量任务引用、Worker 消费；业务库通过明确契约调用，不在前端引入 AMQP。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

通过 ConfigService.rabbitmq 注入连接参数；WORKER_CONCURRENCY 直接从进程 env 解析为 prefetch。本库不加载 .env。

| 变量                                                | 含义                                        | 何时配置/默认                            | 值从哪里来                                            |
| --------------------------------------------------- | ------------------------------------------- | ---------------------------------------- | ----------------------------------------------------- |
| `RABBITMQ_URI`                                      | AMQP 连接串                                 | 队列连接需要；默认 amqp://localhost:5672 | RabbitMQ vhost/服务账户/网络地址                      |
| `RABBITMQ_EXCHANGE_NAME` / `RABBITMQ_EXCHANGE_TYPE` | 业务 exchange 名与 direct/topic/fanout 类型 | 默认 core/direct                         | 消费/发布双方约定；平台 smoke 使用契约内固定 exchange |
| `WORKER_CONCURRENCY`                                | prefetchCount 并发控制输入                  | 默认/校验见 rabbitmq.module.ts           | 依据 Worker 容量配置，不等于 Nx parallel              |

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project server-rabbitmq --json
pnpm nx run server-rabbitmq:lint
pnpm nx run server-rabbitmq:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run server-rabbitmq:test --run
```

mock AmqpConnection，验证 messageId/correlationId/persistent 和错误传播；队列持久化/路由/重试必须加真实 broker 集成测试。

现有用例示例：[src/msg-pub.service.spec.ts](src/msg-pub.service.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
