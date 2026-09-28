# 测试开发指南

Ray 的测试设施面向可复用开发框架：维护者提供测试入口、隔离环境、fixture、报告和验证框架能力的用例；业务开发者编写自己的领域规则与业务流程测试。已有业务示例不等于所有使用者都必须运行的框架检查。后续工具选型、入口约定和分阶段验收见 [框架测试与 CI 实施方案](testing-framework-plan.md)；该方案中的未实施入口不能当作现有命令执行。

## 选择测试入口

通过 Nx 执行项目测试。先查看目标配置，确认项目实际提供的任务与测试文件：

```sh
pnpm nx show project engine --json
pnpm nx run engine:test
pnpm nx run-many -t lint,typecheck,test -p engine,pulse,worker
```

根 `vitest.config.ts` 发现 apps/libs/services 下的专用 Vitest 配置，便于编辑器和聚合运行。配置文件不会自动创建用例；`run-many` 跳过缺失 target 也不表示该项目已被测试。

## 编写行为测试

在项目配置的 include 范围内添加 `*.spec.ts` / `*.spec.tsx`。优先覆盖公共 API 的正常行为、拒绝条件、异常与重复调用。数据库/SDK/网络使用替身时，测试结论只涉及该层逻辑。

Node 代码使用 Node 环境，Web 组件使用 jsdom 与 Testing Library。读取环境的模块先设置测试变量，再动态导入；测试结束恢复环境和 mock。测试不使用真实生产凭据。

参考 [事件契约](../../libs/platform-contract/src/lib/platform-contract.spec.ts)、[Billing API](../../libs/api-client/src/domains/__tests__/billing.spec.ts)、[Billing Use Case](../../services/engine/src/application/use-cases/billing/__tests__/billing-use-cases.spec.ts)。

## 没有 test target 怎么办

按运行时选择配置：Node/Web 和平台无关 TypeScript 可复用 Vitest；真正渲染 React Native 组件或依赖 Expo 测试适配的套件优先使用 Jest + jest-expo。补齐 alias、环境与用例收集范围，再添加实际行为用例。用 `nx show project` 确认目标存在并运行非零用例；不要用 `passWithNoTests` 表示已有覆盖。

Electron main 与 renderer 需要不同环境；Native SDK 需要平台专用替身。桌面测试与打包验证入口见 [Desktop README](../../apps/desktop/README.md)。

## 数据库集成

在独立空数据库中使用当前初始化迁移，验证部署可重复执行，并核对数据库与模型：

```sh
# .env.local-test 只配置独立的测试数据库
pnpm exec dotenv -e .env.local-test -- pnpm nx run pg-dao:init
pnpm exec dotenv -e .env.local-test -- pnpm nx run pg-dao:deploy
pnpm exec dotenv -e .env.local-test -- pnpm nx run pg-dao:prisma -- migrate diff --from-config-datasource --to-schema=./src --exit-code
```

业务集成测试还应验证外键、唯一性、所有者约束、事务与授权。Prisma 无法表达的 CHECK 位于初始化 SQL 中，模型 diff 不替代这些约束的实际写入测试。

## Web 与服务集成

```sh
pnpm exec playwright install chromium firefox webkit
pnpm nx run web:build
pnpm nx run web-e2e:e2e
```

未设置 `BASE_URL` 时 Playwright 启动构建好的 Web 服务，默认端口 4173；它不会启动 Engine 或初始化数据库。设置 `BASE_URL` 可验证指定环境，其他配置见 [Web E2E](../../apps/web-e2e/README.md)。需要凭据的场景被跳过时，应报告为未验证。

- Pulse：认证 WebSocket 探针见 [release 脚本](../../scripts/release/README.md)，通过 Kong `/ws` 验证；授权、过期会话、多实例与断连恢复另写业务集成场景。
- Worker：用独立 RabbitMQ/PostgreSQL 测投递、Inbox 去重、重试与死信；健康响应只能证明就绪状态。
- Mobile：设备上的权限、深链和支付应在模拟器/真机验证；Expo export 仅验证打包。
- Extension：使用实际扩展产物验证 background/content/popup 与权限，普通 Web 页面测试不能替代。

## 框架维护检查

`pnpm ci:checks` 保留两组有明确保护目标的测试：

| 测试 | 验证什么 | 为什么保留 |
| --- | --- | --- |
| `clean.test.mjs` | 在临时 Git 仓库检查预览、已跟踪文件保护、符号链接和产物清理 | 防止维护命令误删源码或仓库外文件 |
| `runtime-boundaries.test.mjs` | 实际执行 ESLint、浏览器打包和 Native 环境读取检查 | 防止运行时边界规则失效 |

它们不参与新项目初始化，也不要求给每个包装脚本单独写测试。容器解析检查、真实启动、第三方沙箱测试分别报告，不以其中一项代替其他项。
