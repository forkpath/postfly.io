# 为什么细化 Email / Analytics / Monitoring，以及现在怎么用

日期：2026-09-10。结论：值得且有必要，但应按真实运行时细化，不必给每个 SDK 单独创建库。修改发生在未提交工作树；没有执行部署、生产迁移或真实提供方调用。

## 1. 原来的问题不是目录名字

原三个项目标记为 runtime:universal，但 email 内含服务端发送和渲染实现，analytics/monitoring 内含 Node SDK、浏览器 SDK 和 Mobile 入口。Nx 的边界检查以项目为单位，不能仅凭同一项目里的 `/server` 子路径识别 Node-only 依赖。

同时 analytics/monitoring 根入口导出 env 文件，导入共享类型/注册函数也会创建所有平台配置。Web preset 还扩展 server preset。它不等于“已发生密钥泄漏”，但扩大了误用与环境耦合范围，标签也没有准确表达能力。Analytics 动态读取 Expo 变量不能依赖 Metro 自动内联。

## 2. 采用的最小拆分

| 项目 | 运行时 | 现在拥有什么 |
| --- | --- | --- |
| email | universal / contract | 模板标识、参数类型、原始发送契约；不读环境、不导入 SDK |
| email-server | node / platform | 既有模板、React Email 渲染、Resend/AWS SES/Aliyun DM 实现 |
| server-email | node / platform | 原有 Nest 注入桥，调用 email-server；没有重复实现发送 |
| analytics / monitoring | universal / platform | 公共类型、策略选择、Adapter 注册表；不读取环境 |
| analytics-web / monitoring-web | web / platform | Web 实现、Desktop renderer 与 Extension Adapter 入口、Vite 公共配置 |
| analytics-native / monitoring-native | native / platform | Mobile Adapter 入口和 Expo 公共配置；原生 SDK 继续由 App 提供 |
| analytics-server / monitoring-server | node / platform | PostHog Node、GA Measurement Protocol 或 Sentry server Adapter，服务端配置 |

新增 7 个 Nx 项目，均为由应用编译的源码库，没有独立 npm 发布、没有为每个项目增加 package.json、没有增加外部依赖版本。当前图为 52 项目；图数据可由 HTML 报告刷新。

Web、Desktop renderer、Extension 虽然宿主不同，但都属于 Web 运行时，因此保留同一项目内的明确入口。Electron main 不属于 Web；若使用 Node 能力，选择 server 入口或现有主进程专属 SDK。没有为了图的节点数量把每个 provider 再拆成项目。

## 3. 开发者迁移表

| 原用法 | 推荐用法 | 兼容说明 |
| --- | --- | --- |
| `@libs/email` | 不变 | 只保留通用契约 |
| `@libs/email/server` | `@libs/email-server` | 旧路径映射到 email-server 公共入口 |
| `@libs/analytics`、`@libs/monitoring` | 不变 | 类型、provider 选择、Adapter 注册接口保留；不再导出 Env/Preset |
| `@libs/analytics/web` | `@libs/analytics-web` | monitoring 同理；旧路径仍兼容 |
| `@libs/analytics/mobile` | `@libs/analytics-native` | monitoring 同理；旧路径仍兼容 |
| `@libs/analytics/server` | `@libs/analytics-server` | monitoring 同理；旧路径仍兼容并受 Node 标签限制 |
| `@libs/analytics/desktop`、`/extension` | `@libs/analytics-web/desktop`、`/extension` | monitoring 同理；旧路径仍兼容 |
| 从根入口导入 desktopEnv 等 | 对应 `@libs/analytics-web/env` 等 | 仓内消费者已迁移 |
| `@libs/analytics/env`、`@libs/monitoring/env` | 明确的 `-web/env`、`-native/env`、`-server/env` | 含混的旧聚合入口已移除；不要重新导出所有平台 env |

这些是 workspace 的显式源码 alias，不是已发布 npm 包的 exports 条件。旧平台 alias 直接指向新项目公共入口，不在 universal 项目留下反向导出的 facade。兼容 alias 和新 alias 都由 ESLint 识别归属。

```ts
// 通用注册接口：不读取凭据
import { registerMobileAnalyticsAdapter } from '@libs/analytics'
// 只有 Expo 公开配置
import { mobileEnv } from '@libs/analytics-native/env'
// 平台运行入口
import { track } from '@libs/analytics-native'
```

Analytics 原有 Adapter 在创建策略时取注册值，因此沿用“先注册、再导入平台入口”的启动顺序。Monitoring 注册表支持后续注册，仍建议先注册再 initialize。本轮不改变这套现有生命周期语义，也不把全局注册表改为请求级身份存储。

## 4. 环境与邮件行为的明确变化

- Web/renderer/extension 只读取显式 VITE_ 字段，不再扩展服务端 preset。SSR 下也如此；服务器配置另从 server/env 导入。
- Native 用静态 `process.env.EXPO_PUBLIC_*`，不使用动态 key、解构或 import.meta；这些值会进入客户端，不可放机密。
- Server 使用服务端字段。GA 新的 `GOOGLE_ANALYTICS_MEASUREMENT_ID` 优先，原 `VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID` 保留为服务端兼容回退。
- Analytics 的浏览器配置优先读 Vite 值，避免存在空 process.env shim 时屏蔽 Vite 配置。
- 邮件入口 import 不再要求发送凭据；第一次发送才加载默认 Resend provider。sendEmail 仍渲染模板，sendRawEmail 保留原始正文，提供方错误继续向上传播。
- Resend 是既有默认提供方；AWS SES/Aliyun DM 文件完整迁入 email-server，没有删除或宣称已通过真实签名与投递测试。此轮不是厂商协议重写。

## 5. Nx 和 CI 为什么因此更可信

现在只修改 analytics-server 的实现，不会通过 universal 聚合项目让 Mobile/Web 自动成为消费者。修改核心契约则仍应影响真实使用者。全局配置/锁文件变化仍可能扩大缓存失效范围，因此不能据此宣称 CI 提速了某个百分比。

新增 `scripts/ci/runtime-boundaries.test.mjs`，由已有 `pnpm ci:metrics:test` 自动执行：

1. 解析真实 Nx graph，检查客户端没有到 Node 项目的依赖路径，核心项目不反向依赖实现。
2. 使用实际 ESLint 配置，验证 Web/Native 导入 Node 的新路径和兼容路径都会失败。
3. 将通用入口用 esbuild 打成 browser bundle，确认没有提供方 SDK、envin 或 Node import；不仅是检查 tag 字符串。
4. 使用真实 ESLint 验证 universal 核心禁止重新引入 env/Node/SDK。
5. 用 TypeScript AST 检查 Native env 的 Expo 静态访问形式。

测试失败会阻断现有 CI。没有调整发布权限、Cloud 套餐或部署流程。

## 6. 本轮已验证的范围

```sh
pnpm nx run-many -t lint,typecheck,test,build --all \
  --nxBail --skipNxCache --outputStyle=static --parallel=4
pnpm ci:metrics:test
pnpm ci:nx-cache-contracts
```

- 全量命令退出 0：49 个具有对应任务的项目，以及 3 个依赖任务。
- 新增七个运行时项目的 11 个测试通过：邮件无凭据导入、raw payload/失败传播、真实 OTP 模板渲染；Web/Native/Server 配置隔离和 Adapter 调用；GA legacy ID 回退。
- CI 治理测试 12/12 通过，含上述 5 项新增运行时检查。
- 缓存契约检查通过：48 code projects、39 pinned workflow actions；这些数量不是单测覆盖率。
- 本地完整日志：`/tmp/ray-runtime-full.log`。本轮未执行生产部署、真实云端请求或真实原生设备 E2E；四产品 App 无单测 target 的既有缺口没有被掩盖。

全量构建可证明当前消费者仍能编译，接口测试可证明已覆盖的调用行为；二者都不等价于所有 SDK 的真实集成验收。

参考：[Nx 多维标签](https://nx.dev/docs/guides/enforce-module-boundaries/tag-multiple-dimensions)、[Expo 环境变量静态访问要求](https://docs.expo.dev/guides/environment-variables/)。
