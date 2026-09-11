# web-e2e

## 用途

Playwright Web + API 端到端测试 runner，启动生产 Web bundle 或连接外部测试站点；不是产品 app，也不是 Web 单测。

## Tags、使用者与场景

`type:app` · `runtime:node` · `domain:composition`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

开发者/CI 在隔离数据环境中验证用户流程；禁止误指生产，因为会创建/删除组织、发邀请和创建 checkout。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

playwright.config.ts 与 spec 从进程 env 读取；没有启用文件中的 dotenv 示例。需配置文件时使用根 dotenv wrapper。缺少认证/provider 条件会跳过部分场景，不算通过。

| 变量                                                               | 含义                         | 何时配置/默认                                   | 值从哪里来                                                                   |
| ------------------------------------------------------------------ | ---------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `BASE_URL` / `E2E_WEB_PORT`                                        | 外部 Web 地址 / 本地专用端口 | 无 BASE_URL 则启动本地构建，端口默认 4173       | 隔离测试部署/本地配置                                                        |
| `E2E_API_BASE_URL`                                                 | 隔离 Engine 地址             | 默认 http://localhost:8000                      | 测试服务地址；不会自动启动 Engine                                            |
| `E2E_OWNER_EMAIL` / `E2E_OWNER_PASSWORD`                           | 测试 owner 登录凭据          | 认证场景需要，否则 skip                         | 隔离 DB 预置用户                                                             |
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

当前场景：营销页、登录/Session/用户计费/注销、组织创建切换清理、邀请、组织 Stripe checkout、普通成员拒绝。provider/email flag 仅门禁，不自动部署 mock。当前 spec 使用 /api/billing 等路径，发布 smoke 使用 /api/v1/billing；必须核对网关/controller 的实际路由，不能只靠配置 env 保证全部通过。

## 单元测试：运行与编写

当前没有标准 `web-e2e:test` target，不能执行不存在的命令或用 lint/build 成功冒充单测。接入步骤见[测试开发指南](../../docs/development/testing.md#没有-test-target-怎么办)。

无标准 unit test target；这里的 \*.spec.ts 是 Playwright E2E，不应被 Vitest 收集。测试 helper 可在独立 Node 单测配置中验证，但目前未配置。

现有用例示例：[src/platform-critical-flows.spec.ts](src/platform-critical-flows.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。此项目使用 Playwright，不要照抄 Vitest API。测试说明不代表本次已经执行全部测试。

## E2E：运行与编写

已核对 Engine main.ts：业务 API 使用 `/api/v1`，认证为 `/api/auth`。当前 spec 部分请求缺 `/v1`，直连当前 Engine 会不匹配；需要先改用例或明确测试网关映射。这里记录现状，不在文档任务中静默修改 API/E2E 行为。

先 `pnpm exec playwright install chromium firefox webkit` 安装浏览器，再 `pnpm nx run web:build`。无 BASE_URL 时 runner 启动 apps/web/.output/server/index.mjs，默认 4173；有 BASE_URL 则直连。Engine/DB 不会自动启动。新用例写 src/\*.spec.ts，page 测 UI、request 测 API，唯一数据 + finally 清理，验证权限和副作用；详见 [测试指南](../../docs/development/testing.md)。

所有有写入的流程使用隔离数据/测试账户，缺用例需要额外开发；mock 单测、构建和 readiness 不等于 E2E 完成。[跨端测试方法](../../docs/development/testing.md#其他应用服务-e2e)。
