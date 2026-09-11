# mongo-dao

## 用途

Mongoose 连接模块、Notification/Infographic schema 和 DAO；负责文档数据访问，不是 HTTP API。

## Tags、使用者与场景

`type:data-access` · `runtime:node` · `domain:platform`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

Engine/Worker 等 Node 服务；连接由 root forRoot 建一次，业务模块按需 forFeature。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

本库通过 ConfigService 的 mongo 配置对象取连接参数，不直接读取 .env。Engine 的 server-nest AppConfig 或 Worker app.module 映射下列 env。

| 变量                                                                                  | 含义                 | 何时配置/默认                        | 值从哪里来                               |
| ------------------------------------------------------------------------------------- | -------------------- | ------------------------------------ | ---------------------------------------- |
| `MONGO_HOST` / `MONGO_PORT`                                                           | Mongo 连接地址与端口 | 连接时配置；本地默认 localhost/27017 | Mongo/Compose                            |
| `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` / `MONGO_INITDB_DATABASE` | Mongo 用户/密码/库名 | 连接时配置；源码示例凭据不能投产     | Mongo 管理员；实际服务应使用最小权限账号 |

读取/配置定义：[src/mongo.config.ts](src/mongo.config.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project mongo-dao --json
pnpm nx run mongo-dao:lint
pnpm nx run mongo-dao:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

当前没有标准 `mongo-dao:test` target，不能执行不存在的命令或用 lint/build 成功冒充单测。接入步骤见[测试开发指南](../../docs/development/testing.md#没有-test-target-怎么办)。

补 mock Mongoose model 的过滤/分页/错误测试；隔离 Mongo 验证索引和实际查询。绝不连接生产数据库跑测试。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
