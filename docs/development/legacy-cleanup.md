# 旧项目退役与 Vitest 入口复核

复核日期：2026-09-10。依据为当前工作区源码、Nx resolved project/task graph 和本轮命令结果，不代表生产部署或真实支付验证。

## 结论与迁移台账

| 项目/入口                           | 决定         | 承接位置与证据                                                                                                                                                                                           |
| ----------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `libs/auth`                         | 删除         | 公共契约已在 auth-contract；Web/Native 工厂在 auth-client-web/native；实例、env、seed、Nest 桥在 auth-server。清理前 Nx 图无业务入边；根 alias 已指向 contract，现将源码导入改为显式新名并删除旧 alias。 |
| `libs/billing`                      | 删除         | 类型、catalog、工具在 billing-contract；Stripe/RevenueCat webhook 与 persistence 在 billing-server；原生 SDK 在 billing-client-native。Engine 子 tsconfig 仍指向旧目录的问题也已修正。                   |
| `auth:schema-check`                 | 迁移         | 改为 `auth-server:schema-check`；CI、发布 workflow 和 pg-dao:generate 的 dependsOn 同步迁移。CLI 工具包 manifest 纳入缓存输入。                                                                          |
| `auth:generate-auth-schema`         | 删除         | 原先只是依赖 schema-check 的 noop；不保留误导性的“生成”入口。                                                                                                                                            |
| 旧 Auth/Billing 测试                | 迁移，不丢弃 | 原 24 + 3 个用例迁入两个 contract；纠正 Auth 参数表只执行第一列的问题，并加一个保持空字符串语义的断言。新 contract 合计 32 个用例通过。                                                                  |
| 旧长篇 GUIDE                        | 归档         | [Auth 历史指南](../architecture/archive/auth-guide-before-runtime-split.md)、[Billing 历史指南](../architecture/archive/billing-guide-before-runtime-split.md)。明确标为历史，不再作为当前操作入口。     |
| `scripts/create-engine-lockfile.js` | 保留         | 调用检查只剩文档，但新 package 链路实际验证失败：两个 Nx executor 要求服务源码 package.json，而当前没有。不能认定完整替代，已从备份恢复脚本；它只处理 Engine，不能声称修好了三个服务的部署。             |
| `vitest.workspace.ts`               | 删除         | 旧式独立 workspace 文件；项目清单统一由根 test.projects 管理。                                                                                                                                           |

旧文件（包含删除前未提交文件）已另存 `/tmp/ray-legacy-cleanup.YXvtuf/legacy-source.tar.gz`；临时备份不是长期归档，重要设计已进入仓库 archive。没有执行 git clean/reset，没有删除可选 provider，没有改变 PG schema 或生产数据。

### 公共接口迁移与明确退役的接口

- `@libs/auth` → `@libs/auth-contract`；`@libs/billing` → `@libs/billing-contract`。旧根别名原本已经解析到相同 contract 文件，源码改名不改变解析目标。
- Auth 的 162 个错误码映射逐项比对一致；旧 env 与 auth-server env 文件逐字一致。`AuthClientOptions` / `AuthClientPlugin` 类型由 web/native client 导出，`AuthMobileClientOptions` 由 native client 导出，避免 universal contract 引入 Expo 类型。
- Billing 的旧 `serverEnv` 由 billing-server 承接；公共价格与产品 ID 在 billing-contract catalog 配置中读取；移动 SDK key 在 app/native adapter 中读取。
- 旧 `webPreset` / `mobilePreset` / `webEnv` / `mobileEnv` 没有仓库消费者，且旧根 alias 本就不导出它们。本轮明确退役这些混合 env 入口，不声称新 API 与它们逐名称兼容，尤其不再把 server secrets 混进 Web preset。未来调用者须使用新库 README 指定的配置方式。
- `billing-client-web` 目前只有占位函数，**不是**旧 Billing 的完整替代。实际 Web 计费链路由 Studio、api-client、Engine 与 billing-server 承担。

## 全部剩余 38 个库：为什么保留

以下覆盖清理后的全部库。判断依据是 public API 与功能职责，不是“有无当前示例业务消费者”。逐项目入口与 tags 见 [完整库目录](../../libs/README.md)。

| 库                                                               | 保留依据                                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| analytics、analytics-web、analytics-native、analytics-server     | core 是策略注册/选择和类型；runtime 库是具体适配器，二者不是新旧重复。                                               |
| monitoring、monitoring-web、monitoring-native、monitoring-server | core 保留监控契约/注册逻辑；各平台实现仍需要它。                                                                     |
| api-core、api-client                                             | Axios 传输/错误模型与 React Query/domain 封装是不同层，不是替代关系。                                                |
| auth-contract、auth-client-web、auth-client-native、auth-server  | 认证类型、客户端 SDK 与服务器实例分别有独立运行时职责。                                                              |
| billing-contract、billing-client-native、billing-server          | 计费契约、原生 SDK、服务端 provider/persistence 各自必要。                                                           |
| billing-client-web                                               | 新预留项目，不是旧迁移壳；尚未实现完整 adapter，不能作为功能完成的证据。本轮不借清理旧包之名新增或删除未来产品能力。 |
| common、i18n                                                     | 共享基础工具与翻译源仍为真实功能；没有被 server-kernel/server-nest 完整替代。                                        |
| email、email-server、server-email                                | 通用接口与变量类型、Node 渲染/发送、Nest DI 桥分别保留。后者不能替代邮件模板契约。                                   |
| mongo-dao、pg-dao                                                | 两套持久化适配，不是互相替代。                                                                                       |
| payload、platform-contract                                       | HTTP 校验契约与异步事件信封契约并存。                                                                                |
| server-kernel、server-nest                                       | 稳定配置契约与 Nest 框架能力边界不同。                                                                               |
| server-redis、server-rabbitmq                                    | 缓存/限流与消息设施，按需装配。                                                                                      |
| server-elasticsearch、server-sms、server-storage                 | 可选框架能力；暂无业务消费者也不构成删除依据。Engine 的签名 URL 不完整覆盖通用对象存储操作。                         |
| studio、ui-core、ui-web、ui-native                               | 页面级业务组合、主题/通用基础、Web primitives、Native primitives 不是重复实现。                                      |

`srv-core`、`srv-shared`、`ui-shared`、过渡 `server-platform` 已在此前迁移移除，当前再次检查其 graph/source 残留。`shared` 不是独立 Nx 项目。保留的 analytics/monitoring/email 精确兼容子入口只映射到新实现，不再持有第二套旧实现；删除库不要求盲目删除所有兼容 API。

`scripts/deploy.sh` 仍承担旧危险命令的拒绝与 rollback/finalize 的受控转交，有操作文档引用；本次保留此安全入口。数据库 referenceId 与旧环境变量的过渡兼容受迁移门禁约束，不能因代码库清理而提前执行 Contract。

## 根 Vitest 配置的准确作用

安装版本为 Vitest 4.0.16。根 `vitest.config.ts` 是直接在根运行 Vitest、或编辑器发现测试时使用的聚合配置；Nx 日常按各项目自己的 test target 调用 Vitest，不靠根清单决定所有 Nx 任务。

旧 `vitest.workspace.ts` 曾用于声明多项目。现在统一使用 `test.projects`，避免保留两份不一致的清单。依据：[Vitest 迁移指南](https://vitest.dev/guide/migration.html)、[Test Projects](https://vitest.dev/guide/projects)。

```ts
projects: [
  'apps/**/vitest.config.{mjs,js,ts,mts}',
  'libs/**/vitest.config.{mjs,js,ts,mts}',
  'services/**/vitest.config.{mjs,js,ts,mts}'
]
```

Vitest 技术上可以读取 `vite.config.mts`，并从其中的 `test` 配置获得测试选项；文件名本身并不非法。但当前 Web 的 Vite 配置是 Start/React/Tailwind/Nitro 的应用构建配置，没有测试块，引用它不等于 Web 已有单测，还可能在收集测试时启动不相关的构建插件。因此改为独立测试配置 glob，而不是把所有 app 构建配置都加入。

`.mts` 表示 ESM TypeScript，`.mjs` 表示 ESM JavaScript；`{mjs,js,ts,mts}` 用于匹配多种后缀，不是四种测试类型。用户示例中的 `{mts,js,ts,mts}` 重复了 mts，应去重。

### 四个客户端都需要测试，但不能靠配置凭空获得测试

| 项目      | 当前标准 test target / 单测文件 | 后续实际测试开发                                                                                        |
| --------- | ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Web       | 无 / 无；web-e2e 是另一项目     | 专用 Vitest 配置，DOM/路由/权限组件用例；现有 Playwright 不等同单测。                                   |
| Desktop   | 无 / 无                         | renderer 用 DOM 环境；main/preload 用 Node + Electron mock；真实 IPC/窗口另做 Electron E2E。            |
| Mobile    | 无 / 无                         | 纯 TS 工具可用 Vitest；RN 组件需与 Expo/RN 适配的环境和原生 mock，不应强行使用 DOM；设备 E2E 另行开发。 |
| Extension | 无 / 无                         | storage/message/auth-cookie 的 mock 单测；浏览器真实扩展加载另做 E2E。                                  |

本轮修复测试入口并迁移已有单测，**没有为四个 app 填入空配置或 passWithNoTests，也没有声称补完它们的测试**。根 glob 会接纳后续新增的专用配置；如果某平台选用 Jest 等 runner，接入对应 Nx test target，而不是强制加入 Vitest 清单。具体编写流程见 [测试指南](testing.md)。

## 验证记录

- 清理前：auth 24、billing 3、两个 contract 原有各 2 个测试通过。
- 清理后：根 Vitest 实际执行 61 个测试文件、266 个用例，全部通过；覆盖 33 个已有测试项目，不包括四个 app 的单测。
- `nx run-many -t lint,typecheck,test`：15 个直接相关项目及 24 个上游任务通过；有既存 lint warning，不等于零 warning。
- 七个应用/服务 `build` 加三个依赖任务，禁 Nx Cache 执行通过；包含 Expo export、Chrome/Firefox extension、Electron bundle，不含签名/安装包/设备运行。
- `auth-server:schema-check` 禁缓存实际执行通过，候选仅生成到临时目录。
- 新增清理防回流、测试入口与 schema 依赖保护测试；接入现有 `ci:metrics:test` 自动发现机制。
- `pg-dao:generate` 与前置的新 schema-check 都实际通过；auth.prisma 前后 SHA-256 一致（c7790c1e5291cb855813de7718b6c237bed0308277a1147fa0c481527bf89efb）。
- 三个服务的 `package` 验证失败，原因见上表；失败不是应用 build 失败。本轮未通过添加源码 manifest 或修改部署方案绕过这项既有缺陷。
- 最终全量 `lint,typecheck,test` 禁 Nx Cache 执行：47 个项目通过。CI 治理测试 16 个通过、0 跳过；缓存契约检查通过。
- 当前 Nx Graph：50 个项目（含根）、116 条边、0 循环；38 个库均在本报告有保留依据。旧 auth/billing 目录已移除。
- 旧 Engine lockfile 脚本恢复后实际执行成功，生成 dist 下的 pnpm-lock.yaml；没有因此宣称 Pulse/Worker package 或 Docker 镜像验证通过。
- 更新 HTML 的 50 个交互图节点已验证；点击 auth-server 能显示 schema-check。43 份当前指南的本地链接检查无断链；`git diff --check` 通过。Prisma generate 产生的注释尾空格已清除，没有修改 schema。

未执行生产数据库迁移、部署、签名、支付 provider 真实调用或客户端 E2E。Better Auth CLI 1.4.21 与 runtime 1.6.26 的既有版本差异未在本次清理升级；schema-check 通过仅证明现有逻辑比较器通过，不是完整认证回归证明。
