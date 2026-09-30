# 依赖维护与安全检查

依赖版本以根 `pnpm-lock.yaml` 为准，使用 `packageManager` 指定的 pnpm。
应用自己直接导入的包应在该应用的 manifest 中声明；跨应用共享的版本放在
`pnpm-workspace.yaml` 的 catalog 中。根 manifest 仍为没有独立 package 的
Web、后端和共享库提供依赖，不能因为 Mobile 也使用某个包就从根删除它。

## 分组更新

`.github/dependabot.yml` 每周检查 pnpm 和 GitHub Actions，Nx、Expo/React Native、
Better Auth、Prisma 按关联工具链分组，其他依赖的 minor/patch 更新分为开发和运行时组。
所有更新通过 PR 审核，不自动合并。Nx 升级需要检查迁移，Expo 更新需要验证完整
SDK 配套版本；分组本身不能证明版本兼容。

配置不指定 `target-branch`，以便安全更新使用默认分支配置。建立 dev/main 策略时，
默认开发分支需要与此同步。pnpm 的根锁文件覆盖 Mobile、Extension 和 tools 的
workspace importer，不另外维护应用锁文件。

## 官方源扫描

`Dependency security` 工作流在 PR、dev/main 推送、每周定时及手动触发时运行：

```sh
pnpm audit --registry=https://registry.npmjs.org --audit-level=high --json
```

检查根锁文件，无需安装依赖，也不执行依赖的生命周期脚本。高危或严重告警返回非零，
网络或 registry 错误也按失败处理。报告上传为 `dependency-audit`，保留 7 天。
需要将该检查与 `Required checks` 一起纳入 dev/main 的合并保护。

处理告警时先检查实际依赖路径、受影响版本和调用方式，优先升级直接依赖与对应工具链。
传递依赖 override 必须限定版本范围并通过相关构建和测试。不要自动执行 audit fix、
忽略全部未修复告警，或把扫描失败写成扫描通过。

## 2026-09-30 修复前基线

- 不安装任何依赖的干净目录扫描已复现：退出 1，且没有生成 `node_modules`。
  报告统计为 low 29、moderate 144、high 158、critical 8；这些是扫描器统计，
  不能等同于相同数量的可利用应用漏洞。46 个依赖包涉及 high/critical 告警。
- 清单及来源保存在 `dist/test-results/hardening-20260930/audit-remediation-inventory.json`。
  当时依赖修复、复扫及远端必需检查尚未完成；此记录保留修复前的失败证据。
- AST 导入检查发现 Mobile 未显式声明其直接使用的 `dayjs`；Extension 的
  Playwright、Vitest、React Testing Library 当时仍依赖根工具安装；下述修复已补齐项目声明，
  并复查共享 catalog 和冻结安装，没有为缩小根 manifest 而破坏共享库解析。

选项依据：[Dependabot 官方参考](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)、
[pnpm audit](https://pnpm.io/10.x/cli/audit)。

## 安全修复实施（2026-09-30）

修复前官方源复扫为 low 29、moderate 155、high 169、critical 9，涉及
47 个不同 high/critical 包。扫描包含开发工具链；这些数字不代表可利用的运行时漏洞数。
原始报告保留为 `dist/test-results/hardening-20260930/dependency-audit-current.json`。

- 认证 CLI 从已弃用的 `@better-auth/cli@1.4.21` 切换到官方 `auth@1.6.26`，
  与现有运行时同版；schema 门禁仍只生成临时候选，不能覆盖受控模型。
- Vitest、UI 和 V8 coverage 固定为同一 `4.1.11`，版本放在共享 catalog。
- Electron 固定为 `41.10.7`，打包配置直接读取 manifest 的固定版本。
  该版本使用维护中的 `@electron-internal/extract-zip`，移除无修复版本的旧 extract-zip 路径。
  本轮选择修复已知告警的较小主版本跨度，不能把这当作后续持续支持期限的承诺。
- Nest 核心、测试与 HTTP/WS adapters 对齐 `11.2.6`；Axios、Lodash、WS 保持当前主版本升级。
- Mobile 直接声明 dayjs；Extension 直接声明 Playwright、Vitest、React Testing Library。
  共享版本集中在 catalog，根依赖继续服务于共享库，原生 SDK 与 React 固定版本保持不变。

`pnpm-workspace.yaml` 中的安全 overrides 仅匹配受影响版本区间，修复后的新版本不被
降级。补丁来源是官方源扫描返回的 GHSA 修复范围及 npm 发布元数据；没有使用 audit
忽略名单。brace-expansion、minimatch、js-yaml、picomatch 和 svgo 分别保持各自主版本。
不应把这些安全下限改成无范围的永久统一版本。

三个需要额外兼容性确认的范围为：Prisma 7.8 配置使用的 deepmerge-ts 7 → 8；
构建工具的 serialize-javascript 6 → 7；Firefox profile 使用的 adm-zip 0.5 → 0.6。
前两者保留其调用方使用的 CommonJS/import 导出，Node 24 满足引擎要求。
已验证调用方实际解析到的版本、深合并与输入不变、函数/正则序列化及归档往返，
同时完成真实 Prisma 迁移/schema、Web/Extension 构建与 Firefox 打包。

本地验证结果如下；移动 JS 导出与真实原生设备 CI 分开报告。
最终提交的远端矩阵仍需集中执行，旧提交的 CI 不能替代本轮依赖升级验收。

| 验证                   | 本地结果                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| 无应用 `.env` 冻结安装 | 无 `.env`/`node_modules` 的源码副本通过；pnpm 用时 2 分 53 秒，复用本机下载缓存                               |
| 官方源安全复扫         | 退出 0：high 0、critical 0；保留 low 12、moderate 58，未配置忽略名单                                          |
| 全仓单测与覆盖率       | 40 个项目通过；38 个 Vitest 门槛保持原值，另含 Mobile Jest 与生成器 Node 测试                                 |
| 类型与零警告 lint      | 48 项目共 106 个任务通过；兼容性修复后另有 29 项相关任务通过                                                  |
| 后端真实集成/E2E       | Engine/Pulse/Worker 六套共 28 项通过；本次容器、网络、卷全部清理                                              |
| Web marketing          | Chromium、Firefox、WebKit 三个真实生产页面流程通过，无重试                                                    |
| Extension              | Chromium 真实扩展 7 项通过，Firefox 产物打包通过                                                              |
| Desktop                | Electron 41.10.7 macOS x64 打包 UI、仓外 smoke、更新故障及下载流程通过                                        |
| Mobile                 | iOS/Android Hermes 与 Web 导出通过，8 分 54 秒；不等于原生构建或设备验收                                      |
| Auth schema 与 CI 合约 | 新 CLI schema 与受控模型一致；36 项 CI 行为合约通过                                                           |
| 生成器实际验收         | 临时副本生成个人/组织资源、拒绝重复写入、类型/lint/覆盖率与真实 HTTP/PostgreSQL 通过；10 项 HTTP 测试，无失败 |
| 项目依赖归属           | AST 检查 Mobile 141 文件/48 个包、Extension 52 文件/17 个包，无缺失直接声明                                   |

原始日志与报告位于 `dist/test-results/hardening-20260930/dependency-*`，后端逐套报告
及清理核验汇总为 `dependency-backend-acceptance.json`。生成器复验报告为
`dist/test-results/ray-plugin/2026-09-30T06-25-30.952Z/acceptance.json`，
`passed=true, cleaned=true`；其容器、网络与卷另外核验无残留。本地桌面测试使用隔离认证与
mock Keychain；未验证签名安装、真实钥匙串迁移或 Windows 更新重启。移动设备、
其他桌面平台与最终同一提交远端门禁保持未完成状态。

### 升级时发现的兼容性问题

- Vitest 4.1 使用工作区的 Vite 8。Extension 的 JSX 配置改为 Oxc 的自动 runtime；
  38 个受控源码文件均保留在覆盖率报告中，未通过排除 TSX 绕过失败。
- 后端套件已经由 SWC 处理 TypeScript 与 Nest 装饰器元数据，因此显式关闭第二次
  Oxc 转换。实际转换复现了派生类成员赋值被移到 `super()` 之前的问题；修复后
  Engine 的生产模块装配、真实 HTTP 与仓储集成测试通过，不修改认证模块来规避编译问题。
- Worker 单测显式替换数据库注入 token，继续使用已有内存 Inbox；真实持久化与
  broker 行为仍由独立集成/E2E 验证。新转换器保留 DI 元数据时不会意外初始化开发数据库。
- Electron 的首次本地 UI 验收超时。进程采样显示主线程等待 macOS Keychain，
  与未签名测试包读取已有钥匙串项有关。临时测试启动入口使用 mock Keychain 后，
  相同 Electron 版本的实际包和 UI 验收通过；正式应用配置与安全 Fuse 保持原值。
  同时修复启动失败时遗漏删除临时 profile 的清理边界。该验收不包含真实钥匙串兼容性，
  详见 [桌面测试边界](../../apps/desktop/README.md#测试)。

参考：[官方 CLI](https://better-auth.com/docs/concepts/cli)、
[Electron 41.10.7](https://github.com/electron/electron/releases/tag/v41.10.7)、
[extract-zip 告警](https://github.com/advisories/GHSA-jmr9-qjv8-65gv)、
[deepmerge-ts 告警](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)、
[Vite Oxc 配置](https://vite.dev/config/shared-options#oxc)、
[Electron 测试钥匙串隔离](https://releases.electronjs.org/pr/53790)。
