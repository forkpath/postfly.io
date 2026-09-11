# auth-server

## 用途

Node Better Auth 实例、数据库适配、认证插件及 Nest guard/decorator/session 集成；提供账户初始化脚本。

## Tags、使用者与场景

`type:platform` · `runtime:node` · `domain:auth`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

Engine/Pulse 等 Node 应用；通用入口 @libs/auth-server，Nest 集成使用明确声明的 @libs/auth-server/nest。前端禁止使用。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

src/lib/env.ts 使用 envin 从启动进程读取；在 import 前注入。依赖 pg-dao 和邮件实现的配置见下列链接。OAuth 配置和客户端功能开关不是同一个配置层。

| 变量                                                                                     | 含义                                              | 何时配置/默认                          | 值从哪里来                                |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------- | ----------------------------------------- |
| `BETTER_AUTH_SECRET`                                                                     | 认证签名/加密密钥                                 | 必填，生产使用足够长的随机秘密         | secret manager 生成，不能放客户端         |
| `BETTER_AUTH_URL`                                                                        | 认证对外基础 URL                                  | 实际启动应显式填写合法 URL             | 部署域名及认证路由配置                    |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`                                              | Google OAuth 应用 ID/密钥                         | 启用 Google 登录时配置                 | Google Cloud OAuth 应用后台               |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`                                              | GitHub OAuth 应用 ID/密钥                         | 启用 GitHub 登录时配置                 | GitHub OAuth App 后台                     |
| `AUTH_APPLE_CLIENT_ID` / `AUTH_APPLE_CLIENT_SECRET` / `AUTH_APPLE_APP_BUNDLE_IDENTIFIER` | Apple 服务/应用 ID、签名 client secret、Bundle ID | 启用 Apple 登录时配置                  | Apple Developer；secret 按 Apple 要求生成 |
| `SEED_EMAIL` / `SEED_PASSWORD`                                                           | 初始化管理账户                                    | 仅 seed 时配置，禁止用源码默认密码投产 | 受控种子账户，不是普通登录用户输入        |
| `NODE_ENV`                                                                               | 影响认证环境行为                                  | 默认 development                       | 进程启动环境                              |

依赖配置：[pg-dao](../../libs/pg-dao/README.md)、[email-server](../../libs/email-server/README.md)。只在实际启用对应路径时提供厂商配置，不把服务端密钥放到客户端。

读取/配置定义：[src/lib/env.ts](src/lib/env.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project auth-server --json
pnpm nx run auth-server:lint
pnpm nx run auth-server:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

受控初始化入口为 `pnpm exec dotenv -e .env.local-test -- pnpm nx run auth-server:seed`，会创建/修改账户。Schema 治理由 `pnpm nx run auth-server:schema-check` 负责；旧 auth 项目已移除。

## 单元测试：运行与编写

```sh
pnpm nx run auth-server:test --run
```

mock PG/邮件/厂商模块，验证认证配置和权限默认值；现有单测不是完整 Better Auth 认证回归矩阵。seed 会写 DB，仅隔离环境或受控初始化运行。

现有用例示例：[src/lib/auth-server.spec.ts](src/lib/auth-server.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
