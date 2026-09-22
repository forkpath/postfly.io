# server-redis

## 用途

RedisService、CacheModule、ThrottlerModule 和连接/缓存/限流配置，Node 平台适配。

## Tags、使用者与场景

`type:platform` · `runtime:node` · `domain:platform`。

Engine 缓存/限流、Pulse 广播等；通过 Nest 注册与 DI 使用，不在通用 util 中初始化连接。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

通过 ConfigService 的 redis/cache/throttler 对象注入；本库不自行加载 .env。server-nest AppConfig 映射下表；Pulse 只映射 redis 连接字段。

| 变量                                                                             | 含义                                             | 何时配置/默认                                     | 值从哪里来                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------- | -------------------------------- |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`                                   | Redis 连接                                       | 使用 Redis 时配置；本地默认 localhost/6379/空密码 | Redis 实例/Compose 网络配置      |
| `CACHE_TTL` / `CACHE_DB_INDEX`                                                   | 缓存 TTL（毫秒）与逻辑 DB                        | server-nest 默认两小时/0                          | 应用缓存策略；示例 DB 为 1       |
| `THROTTLER_TTL` / `THROTTLER_LIMIT` / `THROTTLER_STORAGE` / `THROTTLER_DB_INDEX` | 限流窗口（毫秒）、次数、memory 或 redis、逻辑 DB | 按需要配置；默认 60000/10/memory/2                | 流量容量策略，不能当用户权限校验 |

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project server-redis --json
pnpm nx run server-redis:lint
pnpm nx run server-redis:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run server-redis:test --run
```

mock ioredis，验证连接参数、get/set/TTL、错误传播和销毁；跨实例与断线恢复需真实隔离 Redis。

现有用例示例：[src/redis.service.spec.ts](src/redis.service.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。
