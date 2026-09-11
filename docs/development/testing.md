# 如何运行与编写测试

## 根配置与 Nx 项目测试的区别

根 `vitest.config.ts` 用 `test.projects` 发现 apps/libs/services 下的专用 `vitest.config.{mjs,js,ts,mts}`；旧 `vitest.workspace.ts` 已退役。Vite 构建配置可以包含测试配置，但不能因为存在 `vite.config.mts` 就认定项目已有单测。当前 Web 的配置含应用构建插件且没有 test 块，因此不再作为根测试入口。

日常通过各项目 Nx test target 执行；根配置用于直接 Vitest 聚合运行和编辑器发现。配置 glob 本身不创建测试，也不创建缺失项目的 Nx target。2026-09-10 根聚合实际运行 61 文件、266 用例通过，但四个 app 仍无独立单测；迁移细节见[旧包清理与测试入口复核](legacy-cleanup.md)。

## 先确认真实入口

```sh
pnpm nx show project engine --json
pnpm nx run engine:test --run
```

Vitest 经 Nx 运行，--run 为单次模式。test-ci 子任务由插件推导，日常从 test 入手。各 README 链接实际用例。

Web/Desktop/Mobile/Extension 当前没有标准单测 target；common/email/i18n/mongo-dao/pg-dao/ui-core/ui-web/ui-native 同样没有。lint/typecheck/build 或 run-many 跳过缺失 target，不等于这些项目已经测试。

## 已有 Vitest 项目新增测试

1. 在 src 下写 _.spec.ts（React 用 _.spec.tsx），核对 vitest.config.mts 的 include。
2. 公共行为优先从 public API 测；内部纯函数可相对导入。覆盖正常、边界、拒绝、异常、重复调用，不只断言占位字符串。
3. mock 数据库、网络、SDK、时钟、随机数。Node 逻辑用 node，DOM 组件用 jsdom + Testing Library；Native SDK 需要专用 mock。
4. import 时读取 env 的模块先 vi.stubEnv，再 vi.resetModules/动态 import，afterEach 恢复环境和 mock；不要读取生产凭据。
5. 用 pnpm nx run <项目>:test --run 检查实际执行用例。需要覆盖率时使用该配置支持的 --coverage，并检查文件确实生成。

参考 [信封校验](../../libs/platform-contract/src/lib/platform-contract.spec.ts)、[API Billing](../../libs/api-client/src/domains/__tests__/billing.spec.ts)、[Engine Billing 用例](../../services/engine/src/application/use-cases/billing/__tests__/billing-use-cases.spec.ts)。

### 一个真实契约测试例子

例如在 platform-contract 项目中新增测试，可以直接使用已导出的 validator：

```ts
import { describe, expect, it } from 'vitest'

import { isEventEnvelopeV1 } from './index'

describe('event envelope rejection', () => {
  it('rejects missing envelope data', () => {
    expect(isEventEnvelopeV1(null)).toBe(false)
    expect(isEventEnvelopeV1({ version: 99 })).toBe(false)
  })
```

示例文件位置为该库 src 下；新业务应补正常/异常的实际断言，而非重复已有测试。单测不需要启动 Engine 或数据库。

## 没有 test target 怎么办

这是后续测试开发工作，不是本次 README 自动补好的能力：

1. 参考同 runtime 的 vitest.config.mts（Node：server-redis；Web：analytics-web；契约：platform-contract），配置项目 root、alias、include 和测试环境。
2. 补测试 TS 类型/配置和至少一个真实行为用例；用 nx show project 确认插件推导出了 test，否则显式添加 target/inputs/outputs。
3. Electron renderer 用 jsdom，main 用 Node 并 mock Electron；Mobile 先接入与 Expo/RN 匹配的测试环境与 Native 模块 mock，不能直接搬 Web DOM 测试。
4. CI 同步接入并断言非零用例，不能用 passWithNoTests 证明覆盖。

## Web/Engine E2E 已有入口

```sh
pnpm exec playwright install chromium firefox webkit
pnpm nx run web:build
pnpm nx run web-e2e:e2e
```

安装浏览器有下载副作用。未配置 BASE_URL 时，Playwright 启动构建好的 Web server，默认专用 4173 端口，不复用开发服务；不会启动 Engine 或初始化 DB。测试账户/组织配置见 [web-e2e](../../apps/web-e2e/README.md)。配置 BASE_URL 则直接测试指定地址。

新增文件放 apps/web-e2e/src/\*.spec.ts；page 测页面，request 测真实 API。数据唯一命名，try/finally 清理，验证响应语义、Session 注销、权限拒绝；secret 放 CI secret。不要只断言页面存在。

OAuth、Passkey、2FA、完整注册、原生支付、完整 Webhook 回放仍需补场景和设施。E2E_PROVIDER_MOCK_ENABLED=true 仅解除测试门禁，不会自动创建 Stripe mock；EMAIL_MOCK 同理。缺配置 skip 不算通过。

### 新增页面 E2E 的最小形式

在 apps/web-e2e/src 新增独立 spec，可用下面的结构验证自己的页面；selector 应选择稳定的可访问角色/名称，复杂流程进一步断言权限和数据变化：

```ts
import { expect, test } from '@playwright/test'

test('marketing entry is reachable', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.ok()).toBe(true)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
})
```

这是编写形式示例，不代表新增了该测试，也不能只复制这个简单场景就认为用户业务流程被覆盖。

## 其他应用/服务 E2E

- Desktop：暂无独立 target。后续建立 Playwright Electron 项目，覆盖实际窗口/preload/IPC、登录、深链、退出；安装/签名按目标 OS 验证。
- Mobile：暂无设备 E2E target。后续评估并固定 Maestro/Detox 等设备方案，开发构建 + iOS/Android 模拟器验证权限、深链、恢复、商店 sandbox。Expo export 不是 E2E。
- Extension：暂无独立 target。后续加载真实扩展产物，覆盖 popup/content/background、权限和 storage，Firefox 单独适配；普通 Web E2E 不能替代。
- Pulse：已有认证 WebSocket smoke，缺未认证、越权、过期、多实例、限流、断连等完整矩阵。
- Worker：现有消费者/注册表单测使用替身；后续启动隔离 RabbitMQ + PG，投递信封后查 Inbox、ack/retry/DLQ，覆盖重复、失败、未知版本和恢复。readiness/日志不等于端到端消费成功。

数据库验证见 [migration-tests](../../tools/migration-tests/README.md)，隔离治理见 [boundary-checks](boundary-checks.md)。这些层次互补，不能互相冒充。
