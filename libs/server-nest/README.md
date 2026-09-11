# server-nest

## 用途

Nest 通用配置、异常过滤、装饰器、拦截器、日志和 i18n 适配，取代笼统 srv-core/srv-shared 中相应职责。

## Tags、使用者与场景

`type:platform` · `runtime:node` · `domain:platform`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

Node Nest 服务；只组合框架基础能力，不承载 Billing 等业务用例。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

src/config/index.ts 的 AppConfig 读取进程 env 并返回各命名配置。导出字段不代表对应可选 adapter 已启用；不用的 SMS/ES 不会因此自动发请求。

| 变量                                                                                       | 含义                                                 | 何时配置/默认                                               | 值从哪里来                                                     |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| `ENGINE_PORT` / `CORS_ORIGINS`                                                             | Engine 监听端口/允许跨域来源                         | AppConfig 默认 6006/\*；本仓库 dev 示例为 8000              | 服务拓扑；生产限制明确的受信 origin                            |
| `LOGGER_LEVEL` / `LOGGER_SCOPE`                                                            | 日志等级与 scope                                     | 默认 info/neo                                               | 运维日志策略                                                   |
| `LOGGER_FILE_ENABLED` / `LOGGER_FILE_COMPRESS`                                             | 文件日志/压缩开关                                    | 当前 AppConfig 直接调用 toLowerCase；应显式设 true 或 false | 本地/部署配置，不应省略                                        |
| `LOGGER_FILE_SIZE_LIMIT` / `LOGGER_FILE_EXPIRED_IN`                                        | 轮转文件大小与保留周期                               | 默认 20M/14d                                                | 日志存储/审计策略                                              |
| `DEFAULT_LOCALE` / `LOCALE_PATH`                                                           | 服务端语言回退/翻译文件路径                          | 默认 en 和 libs/i18n/src/translations                       | 产品语言策略；容器中应指向实际复制路径                         |
| `NODE_ENV`                                                                                 | 日志等运行模式                                       | 开发用 development，测试 test                               | 启动环境                                                       |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`                                             | Redis 连接                                           | 使用 Redis 时配置；本地默认 localhost/6379/空密码           | Redis 实例/Compose 网络配置                                    |
| `CACHE_TTL` / `CACHE_DB_INDEX`                                                             | 缓存 TTL（毫秒）与逻辑 DB                            | server-nest 默认两小时/0                                    | 应用缓存策略；示例 DB 为 1                                     |
| `THROTTLER_TTL` / `THROTTLER_LIMIT` / `THROTTLER_STORAGE` / `THROTTLER_DB_INDEX`           | 限流窗口（毫秒）、次数、memory 或 redis、逻辑 DB     | 按需要配置；默认 60000/10/memory/2                          | 流量容量策略，不能当用户权限校验                               |
| `MONGO_HOST` / `MONGO_PORT`                                                                | Mongo 连接地址与端口                                 | 连接时配置；本地默认 localhost/27017                        | Mongo/Compose                                                  |
| `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` / `MONGO_INITDB_DATABASE`      | Mongo 用户/密码/库名                                 | 连接时配置；源码示例凭据不能投产                            | Mongo 管理员；实际服务应使用最小权限账号                       |
| `RABBITMQ_URI`                                                                             | AMQP 连接串                                          | 队列连接需要；默认 amqp://localhost:5672                    | RabbitMQ vhost/服务账户/网络地址                               |
| `RABBITMQ_EXCHANGE_NAME` / `RABBITMQ_EXCHANGE_TYPE`                                        | 业务 exchange 名与 direct/topic/fanout 类型          | 默认 core/direct                                            | 消费/发布双方约定；平台 smoke 使用契约内固定 exchange          |
| `WORKER_CONCURRENCY`                                                                       | prefetchCount 并发控制输入                           | 默认/校验见 rabbitmq.module.ts                              | 依据 Worker 容量配置，不等于 Nx parallel                       |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_ACCESS_KEY_SECRET`                                      | 对象存储账号凭据                                     | 启用存储时必填                                              | AWS IAM/阿里云 RAM 最小权限账号                                |
| `STORAGE_BUCKET` / `STORAGE_REGION`                                                        | 存储桶和区域                                         | 启用时配置                                                  | 预先创建的 bucket                                              |
| `STORAGE_END_POINT`                                                                        | server-nest/现有 Engine 存储配置读取的 endpoint 拼写 | S3 兼容服务按需配置                                         | 存储服务完整 endpoint；不是通用自动别名                        |
| `SMS_ACCESS_KEY_ID` / `SMS_ACCESS_KEY_SECRET` / `SMS_SIGN_NAME`                            | 阿里云短信账号和已审核签名                           | 显式启用短信模块时必填                                      | 阿里云 RAM/短信控制台；模板编码作为 send 参数                  |
| `ELASTICSEARCH_HOST` / `ELASTICSEARCH_PORT` / `ELASTICSEARCH_API_KEY`                      | 搜索服务主机、端口、认证                             | 启用搜索模块时配置                                          | ES 管理员；当前模块拼接 HTTP host/port，不接受随意填 HTTPS URL |
| `ELASTICSEARCH_MAX_RETRIES` / `ELASTICSEARCH_REQUEST_TIMEOUT` / `ELASTICSEARCH_DATA_INDEX` | 重试次数、超时毫秒、索引名                           | 默认 3/30000/neo_data                                       | 服务容量/索引规划，模块不自动创建业务索引                      |

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project server-nest --json
pnpm nx run server-nest:lint
pnpm nx run server-nest:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run server-nest:test --run
```

参考异常过滤测试；补日志脱敏、异常映射、响应包装、配置缺省和限流边界的单元测试。

现有用例示例：[src/filters/**tests**/all-exception.filter.spec.ts](src/filters/__tests__/all-exception.filter.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
