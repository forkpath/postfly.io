# 单元测试覆盖率门槛

CI 的质量任务设置 `RAY_TEST_COVERAGE=true`，现有 `nx affected -t ...test...`
对受影响项目执行覆盖率检查；全量任务使用同一份配置。覆盖率不足由 Vitest 返回非零，
沿主质量任务进入 `Required checks`。普通本地单测默认不采集覆盖率。

```sh
# 单个项目，检查其完整单测套件与覆盖率
RAY_TEST_COVERAGE=true pnpm nx run ui-web:test
# 多个项目
RAY_TEST_COVERAGE=true pnpm nx run-many -t test -p ui-web,web,engine
# 当前分支受影响项目；基线按实际目标分支选择
RAY_TEST_COVERAGE=true pnpm nx affected -t test --base=arch
```

不要用按单文件分片的 `test-ci--*` 入口检查项目总覆盖率；本工作区 CI 使用完整的
`test` target。根 Vitest 的多项目聚合入口也不能替代各 Nx 项目的独立门槛。
Mobile 使用 Jest，其已有 React Native 示例继续通过 `mobile:test` 验证；本策略针对
38 个 Vitest 项目，不把 DOM/mock 测试计为真实移动设备验收。

## 统计范围与缓存

共享策略在 `scripts/testing/unit-coverage.mts`，门槛在
`unit-coverage-thresholds.json`。统计每个项目 `src` 下的 TS/JS，包括没有被任何测试
导入的文件；只排除声明文件、测试文件/目录、生成代码和生成的路由树。没有把仓储、
页面、可选 provider 或尚未覆盖的业务文件排除以提高百分比。

报告包含 HTML、LCOV 和 JSON summary，写入 `coverage/<projectRoot>`，由 Nx 缓存和
CI artifact 保存。`unitTestGlobals` 将开关、共享策略与门槛文件纳入测试缓存输入；
更改采集模式或门槛不能复用不相符的测试结果。CI 合约检查同时要求每个 Vitest 项目
接入共享策略、四项正数门槛及对应缓存输入，新增项目必须显式定义起步门槛。

Vitest 的 `coverage.include` 与 `coverage.thresholds` 行为依据
[官方配置说明](https://vitest.dev/config/coverage)。固定 Node/Vitest 版本后进行比较；
工具升级时重新审阅统计差异，不能仅为获得绿色结果降低门槛。

## 起步基线（2026-09-30）

这是防止现状退步的起点，不代表测试已充分。Web、Studio 和 UI 库的大量界面仍未被
单元测试覆盖；已有页面 E2E 与后端集成测试是独立层次，不混入本表来抬高数字。
初始四项门槛取本轮实测值的 90%，向下保留一位小数，给微小统计变化留余量；
`autoUpdate` 关闭，后续提升及任何降低都必须作为代码变更审阅。

表中四项顺序为 statements / branches / functions / lines，单位为百分比。

| 项目                         | 本轮实测                      | 最低门槛                  |
| ---------------------------- | ----------------------------- | ------------------------- |
| `apps/desktop`               | 38.18 / 52.43 / 31.06 / 40.06 | 34.3 / 47.1 / 27.9 / 36.0 |
| `apps/extension`             | 13.31 / 8.92 / 15.38 / 13.4   | 11.9 / 8.0 / 13.8 / 12.0  |
| `apps/web`                   | 5.14 / 5.2 / 2.52 / 5.39      | 4.6 / 4.6 / 2.2 / 4.8     |
| `libs/analytics`             | 18.42 / 50 / 23.52 / 18.42    | 16.5 / 45.0 / 21.1 / 16.5 |
| `libs/analytics-native`      | 100 / 100 / 100 / 100         | 90.0 / 90.0 / 90.0 / 90.0 |
| `libs/analytics-server`      | 78.26 / 61.11 / 100 / 78.26   | 70.4 / 54.9 / 90.0 / 70.4 |
| `libs/analytics-web`         | 40.57 / 30.76 / 22.22 / 40.57 | 36.5 / 27.6 / 19.9 / 36.5 |
| `libs/api-client`            | 24.68 / 14.01 / 25.33 / 24.13 | 22.2 / 12.6 / 22.7 / 21.7 |
| `libs/api-core`              | 94.11 / 80 / 100 / 95.74      | 84.6 / 72.0 / 90.0 / 86.1 |
| `libs/auth-client-native`    | 45 / 80 / 25 / 37.5           | 40.5 / 72.0 / 22.5 / 33.7 |
| `libs/auth-client-web`       | 52.63 / 80 / 25 / 50          | 47.3 / 72.0 / 22.5 / 45.0 |
| `libs/auth-contract`         | 52.11 / 68.75 / 75 / 49.25    | 46.8 / 61.8 / 67.5 / 44.3 |
| `libs/auth-server`           | 18.66 / 20 / 9.83 / 17.64     | 16.7 / 18.0 / 8.8 / 15.8  |
| `libs/billing-client-native` | 43.58 / 29.54 / 25 / 44.73    | 39.2 / 26.5 / 22.5 / 40.2 |
| `libs/billing-client-web`    | 100 / 100 / 100 / 100         | 90.0 / 90.0 / 90.0 / 90.0 |
| `libs/billing-contract`      | 31.37 / 16.98 / 19.04 / 34.09 | 28.2 / 15.2 / 17.1 / 30.6 |
| `libs/billing-server`        | 11.7 / 9.37 / 31.57 / 12.29   | 10.5 / 8.4 / 28.4 / 11.0  |
| `libs/email-server`          | 36.25 / 15.62 / 20.51 / 36.52 | 32.6 / 14.0 / 18.4 / 32.8 |
| `libs/monitoring`            | 13.72 / 62.5 / 17.39 / 13.72  | 12.3 / 56.2 / 15.6 / 12.3 |
| `libs/monitoring-native`     | 100 / 100 / 100 / 100         | 90.0 / 90.0 / 90.0 / 90.0 |
| `libs/monitoring-server`     | 100 / 100 / 100 / 100         | 90.0 / 90.0 / 90.0 / 90.0 |
| `libs/monitoring-web`        | 60 / 15.78 / 20 / 60          | 54.0 / 14.2 / 18.0 / 54.0 |
| `libs/payload`               | 67.9 / 50 / 85.71 / 67.5      | 61.1 / 45.0 / 77.1 / 60.7 |
| `libs/platform-contract`     | 85.71 / 91.66 / 100 / 85.71   | 77.1 / 82.4 / 90.0 / 77.1 |
| `libs/server-elasticsearch`  | 100 / 100 / 100 / 100         | 90.0 / 90.0 / 90.0 / 90.0 |
| `libs/server-email`          | 84.61 / 100 / 75 / 81.81      | 76.1 / 90.0 / 67.5 / 73.6 |
| `libs/server-kernel`         | 100 / 100 / 100 / 100         | 90.0 / 90.0 / 90.0 / 90.0 |
| `libs/server-nest`           | 13.9 / 5.94 / 10.52 / 14.45   | 12.5 / 5.3 / 9.4 / 13.0   |
| `libs/server-rabbitmq`       | 54.54 / 40 / 50 / 51.85       | 49.0 / 36.0 / 45.0 / 46.6 |
| `libs/server-redis`          | 28.08 / 37.5 / 19.04 / 28.57  | 25.2 / 33.7 / 17.1 / 25.7 |
| `libs/server-sms`            | 100 / 88.88 / 100 / 100       | 90.0 / 79.9 / 90.0 / 90.0 |
| `libs/server-storage`        | 38.52 / 43.28 / 34.14 / 36.36 | 34.6 / 38.9 / 30.7 / 32.7 |
| `libs/studio`                | 4.15 / 1.85 / 2.2 / 3.93      | 3.7 / 1.6 / 1.9 / 3.5     |
| `libs/testing-server`        | 30 / 72.22 / 20 / 31.57       | 27.0 / 64.9 / 18.0 / 28.4 |
| `libs/ui-web`                | 2.05 / 1.44 / 3.43 / 2.12     | 1.8 / 1.2 / 3.0 / 1.9     |
| `services/engine`            | 31.95 / 23.63 / 35.26 / 33.14 | 28.7 / 21.2 / 31.7 / 29.8 |
| `services/pulse`             | 33.5 / 27.45 / 23.07 / 36.9   | 30.1 / 24.7 / 20.7 / 33.2 |
| `services/worker`            | 51.51 / 39.65 / 40.9 / 55.68  | 46.3 / 35.6 / 36.8 / 50.1 |

## 可复制的行为测试

- `libs/ui-web/src/components/ui/*.spec.tsx`：真实 Radix/React 组件，检查禁用按钮、链接
  组合、复选框可访问状态、对话框焦点与 Escape 关闭；不通过 mock 被测组件获得通过。
- `apps/web/src/__tests__/routing.spec.ts`：执行正式文件路由的 beforeLoad、权限函数和
  TanStack memory history，mock 认证网络边界，验证匿名/普通用户/管理员及会话失败。
  测试目录放在 `routes` 之外，避免被文件路由生成器当作页面。
- Native 付费墙示例验证 SDK 结果映射、回调及异常；SDK 为替身，不调用支付服务。
- Auth Guard 示例通过 Nest 注入装配，验证匿名、可选认证、角色拒绝和会话故障；
  真实登录与数据库身份验证由 Engine/Pulse E2E 另行覆盖。

覆盖率只能说明执行范围。业务边界与失败场景仍需明确断言；不能以覆盖率代替
单元测试、集成测试、真实页面/设备 E2E 中任何一层。
