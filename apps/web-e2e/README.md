# web-e2e

## 用途

Playwright Web + API 端到端测试 runner，启动生产 Web bundle 或连接外部测试站点；不是产品 app，也不是 Web 单测。

## Tags、使用者与场景

`type:app` · `runtime:node` · `domain:composition`。

开发者/CI 在隔离数据环境中验证用户流程；禁止误指生产，因为会创建/删除组织、发邀请和创建 checkout。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

playwright.config.ts 与 spec 从进程 env 读取；没有启用文件中的 dotenv 示例。需配置文件时使用根 dotenv wrapper。缺少认证/provider 条件会跳过部分场景，不算通过。

| 变量                                                               | 含义                         | 何时配置/默认                                   | 值从哪里来                                                                   |
| ------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `BASE_URL` / `E2E_WEB_PORT`                                        | 外部 Web 地址 / 本地专用端口 | 无 BASE_URL 则启动本地构建，端口默认 4173       | 隔离测试部署/本地配置                                                        |
| `E2E_API_BASE_URL`                                                 | 隔离 Engine 地址             | 默认 http://localhost:8000                      | 测试服务地址；不会自动启动 Engine                                            |
| `E2E_OWNER_EMAIL` / `E2E_OWNER_PASSWORD`                           | 测试 owner 登录凭据          | 认证场景需要，否则 skip                         | 隔离 DB 预置用户                                                             |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`                           | 平台管理员登录凭据           | 管理员侧栏场景需要，否则 skip                   | 隔离 DB 预置的平台 admin，不能用组织 admin 替代                              |
| `E2E_MEMBER_EMAIL` / `E2E_MEMBER_PASSWORD` / `E2E_ORGANIZATION_ID` | 普通成员凭据与预置组织       | 成员权限场景需要，否则 skip                     | 隔离数据准备；组织需对应 owner/member                                        |
| `E2E_INVITEE_EMAIL` / `E2E_EMAIL_MOCK_ENABLED`                     | 收件人及邀请测试门禁         | EMAIL_MOCK_ENABLED 必须为 true 才运行邀请场景   | 隔离邮箱/测试替身；flag 不会自动部署 mock                                    |
| `E2E_STRIPE_VARIANT_ID` / `E2E_PROVIDER_MOCK_ENABLED`              | 测试套餐 ID 与 checkout 门禁 | PROVIDER_MOCK_ENABLED=true 才运行 checkout 场景 | 现有 billing catalog 的 variant ID（不是直接填写任意 price ID）与已部署 mock |

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project web-e2e --json
pnpm nx run web-e2e:e2e
pnpm nx run web-e2e:lint
pnpm nx run web-e2e:typecheck
```

当前场景：营销页演示交互与响应式布局、用户/管理员侧栏导航、登录/Session/用户计费/注销、组织创建切换清理、邀请、组织 Stripe checkout、普通成员拒绝。provider/email flag 仅门禁，不自动部署 mock。业务 API 使用 `/api/v1`，认证使用 `/api/auth`。

默认 PR 页面套件只选择名称包含 `marketing application` 的用例，在三个浏览器中运行。
侧栏回归需要先启动隔离服务并 seed，设置 `BASE_URL` 和 `E2E_API_BASE_URL` 为该环境的网关地址，
再配置表中的普通用户与平台管理员凭据。bootstrap 的 `SEED_EMAIL` 对应 `+user`/`+admin` 账号，
密码来自该临时环境的 `SEED_PASSWORD`，不要使用生产账户。测试通过真实 Session 验证默认分页、
最后访问页面、悬停菜单、移动菜单选择后关闭与注销；认证请求带与页面一致的 Origin。

```sh
pnpm nx run web-e2e:e2e -- --grep 'sidebar|module navigation' --project=chromium --workers=1
```

`--` 将 Playwright 的 `--project` 传给测试 runner，避免被 Nx 当成项目名。

## 单元测试：运行与编写

当前没有标准 `web-e2e:test` target，不能执行不存在的命令或用 lint/build 成功冒充单测。接入步骤见[测试开发指南](../../docs/development/testing.md#没有-test-target-怎么办)。

无标准 unit test target；这里的 \*.spec.ts 是 Playwright E2E，不应被 Vitest 收集。测试 helper 可在独立 Node 单测配置中验证，但目前未配置。

现有用例示例：[src/platform-critical-flows.spec.ts](src/platform-critical-flows.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。此项目使用 Playwright，不要照抄 Vitest API。

## E2E：运行与编写

Engine 业务 API 使用 `/api/v1`，认证为 `/api/auth`，当前 spec 与这两个前缀一致。侧栏 UI 应通过同时转发 Web 与 API 的网关访问；单独启动 Web 不等于认证环境已经就绪。

先 `pnpm exec playwright install chromium firefox webkit` 安装浏览器，再 `pnpm nx run web:build`。无 BASE_URL 时 runner 启动 apps/web/.output/server/index.mjs，默认 4173；有 BASE_URL 则直连。Engine/DB 不会自动启动。新用例写 src/\*.spec.ts，page 测 UI、request 测 API，唯一数据 + finally 清理，验证权限和副作用；详见 [测试指南](../../docs/development/testing.md)。

所有有写入的流程使用隔离数据/测试账户，缺用例需要额外开发；mock 单测、构建和 readiness 不等于 E2E 完成。[跨端测试方法](../../docs/development/testing.md#web-与服务集成)。
