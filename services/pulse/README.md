# pulse

## 用途

Nest WebSocket 服务：Session/token 握手、组织成员校验、Redis 广播、心跳与限流/缓冲控制、readiness。只含平台 smoke 事件。

## Tags、使用者与场景

`type:app` · `runtime:node` · `domain:composition`。

受认证 WebSocket 客户端；同组织 room 访问仍须服务端 Member 校验，不能相信任意 organizationId。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

dev:pulse 用根 .env。app.module 映射 REDIS_HOST/PORT/PASSWORD（Redis 实例，默认 localhost/6379/空）；main 读 PULSE_PORT → PORT → 3001。PLATFORM_SMOKE_ENABLED 仅精确 true 启用测试事件，应由测试负责人设定，生产默认 false。

| 变量                                                                                     | 含义                                              | 何时配置/默认                          | 值从哪里来                                                  |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| `POSTGRES_DATABASE_URL`                                                                  | Prisma/pg 连接串（含主机、库名与认证）            | 连接 PG 时必填                         | 管理员提供或由本地 POSTGRES_HOST/PORT/USER/PASSWORD/DB 组合 |
| `POSGTRES_DATABASE_URL`                                                                  | 旧拼写，只有新变量未设时回退                      | 仅兼容；不要新增依赖                   | 旧部署配置；非生产会告警                                    |
| `NODE_ENV`                                                                               | 运行模式 development/test/production              | 默认 development                       | 运行命令/部署环境                                           |
| `BETTER_AUTH_SECRET`                                                                     | 认证签名/加密密钥                                 | 必填，生产使用足够长的随机秘密         | secret manager 生成，不能放客户端                           |
| `BETTER_AUTH_URL`                                                                        | 认证对外基础 URL                                  | 实际启动应显式填写合法 URL             | 部署域名及认证路由配置                                      |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                                              | Google OAuth 应用 ID/密钥                         | 启用 Google 登录时配置                 | Google Cloud OAuth 应用后台                                 |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`                                              | GitHub OAuth 应用 ID/密钥                         | 启用 GitHub 登录时配置                 | GitHub OAuth App 后台                                       |
| `AUTH_APPLE_CLIENT_ID` / `AUTH_APPLE_CLIENT_SECRET` / `AUTH_APPLE_APP_BUNDLE_IDENTIFIER` | Apple 服务/应用 ID、签名 client secret、Bundle ID | 启用 Apple 登录时配置                  | Apple Developer；secret 按 Apple 要求生成                   |
| `SEED_EMAIL` / `SEED_PASSWORD`                                                           | 初始化管理账户                                    | 仅 seed 时必填，密码至少 12 字符 | 受控种子账户，不是普通登录用户输入                          |
| `NODE_ENV`                                                                               | 影响认证环境行为                                  | 默认 development                       | 进程启动环境                                                |

依赖配置：[email-server](../../libs/email-server/README.md)。只在实际启用对应路径时提供厂商配置，不把服务端密钥放到客户端。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

### Pulse 自身连接配置

`REDIS_HOST`、`REDIS_PORT`、`REDIS_PASSWORD` 分别是实例主机、端口、密码，来自 Redis 管理员或隔离 Compose；本地默认 localhost/6379/空密码。这里只注册 Redis 连接，不要求 Engine 的 cache/throttler 配置。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project pulse --json
pnpm dev:pulse
pnpm nx run pulse:build
pnpm nx run pulse:lint
pnpm nx run pulse:typecheck
```

## 单元测试：运行与编写

```sh
pnpm nx run pulse:test --run
```

参考 pulse.gateway.spec.ts，mock auth/PG/Redis/socket，测未认证、成员资格、消息解析和缓冲边界；单进程 mock 不证明 Redis 多实例传播。

现有用例示例：[src/app/pulse.gateway.spec.ts](src/app/pulse.gateway.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。

## E2E：运行与编写

现有 `node scripts/release/pulse-smoke-test.mjs` 需要 ENGINE_SMOKE_BASE_URL、SMOKE_EMAIL/SMOKE_PASSWORD、可选 SMOKE_ORGANIZATION_ID。脚本 WebSocket 地址固定 ws://127.0.0.1:3001/ws，须在对应网络命名空间运行，不能靠 Engine URL 改 WS 地址。完整拒绝/过期/跨组织/多实例场景尚待新增；见测试指南。

所有有写入的流程使用隔离数据/测试账户，缺用例需要额外开发；mock 单测、构建和 readiness 不等于 E2E 完成。[跨端测试方法](../../docs/development/testing.md#web-与服务集成)。
