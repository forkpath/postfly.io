# Ray 脚手架优化与验收计划

开始日期：2026-09-30。状态：进行中。基线为已完成框架测试验收的
`3dd1b28cbbf269957144aa5ffd8b08191e3bd640`，工作分支
`codex/framework-hardening-20260930`。既有阶段 0–4 的完成不代表本轮 13 项优化已完成。

本轮保留 Ray 的可选能力、公开 API、运行时边界和真实验收标准。主工作区有大量
既有暂存内容，实施在已附属的 worktree 中进行，不改写主工作区的暂存区。

## 完整需求与验收证据

| 编号 | 要求                                                 | 当前状态                                   | 完成依据                                                                                                                                                                 |
| ---- | ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | 无环境文件的新克隆可安装                             | 干净副本冻结安装通过，正式构建缺配置拒绝   | 仓库外干净副本不带环境与 node_modules，冻结安装成功；正式扩展配置缺失仍拒绝构建                                                                                          |
| 2    | dev 测试、main 正式的 CI/CD；命名 ray、宽度 120 一致 | 待实施；远端尚无 dev/main 或部署环境       | 工作流事件及同一提交门禁正反测试；默认基线与文档一致；dev/main 合并保护读回；真实部署须明确环境                                                                          |
| 3    | CI 强制 nx format:check，并修复存量格式              | 本地全仓格式检查通过，待最终 CI            | 全仓格式检查通过；CI 必需检查包含格式失败                                                                                                                                |
| 4    | analytics-web 冷导入测试稳定                         | 冷启动 3 轮通过，待最终 CI                 | 独立冷启动及并发任务压力下重复通过，保留原断言，不靠 retries 隐藏失败                                                                                                    |
| 5    | 本地确定性完整模块 generator                         | 待实施                                     | 一条 Nx 命令生成 Prisma、Domain、Repository、CQRS、Use Case、Controller、Payload、API client 和测试；干净副本生成后类型/lint/测试/真实 HTTP 与持久化通过；拒绝越界及覆盖 |
| 6    | 覆盖率门槛及跨端测试示例                             | Mobile/Extension 示例已有，其余待补        | Vitest 阈值在 affected CI 强制执行，降低覆盖率的负向验证失败；ui-web 组件、Web 路由示例和已有 Native/扩展示例可复制运行                                                  |
| 7    | Testcontainers 集成环境与真实仓储测试                | 既有 Compose 协议测试通过，需按要求迁移    | Testcontainers 启动 PG/Redis/RabbitMQ（完整服务需要 Mongo 时一并提供）；真实 Repository、Worker 去重/重试/恢复及成功/失败/中断清理验证；保持唯一默认入口                 |
| 8    | PR 前移 E2E                                          | 既有 affected Web/Extension/后端套件已实现 | PR 事件确实选择并执行页面 smoke；需要身份时使用隔离测试账号，失败传播到 Required checks                                                                                  |
| 9    | 分组依赖升级与官方源安全扫描                         | 分组更新/扫描配置已添加；依赖告警待修复    | Renovate 或 Dependabot 配置有效；官方源真实扫描与失败门禁；评估并记录 Mobile/Extension 项目依赖归属                                                                      |
| 10   | CODEOWNERS、PR 模板及分支保护                        | CODEOWNERS/模板已添加；dev/main 保护待补   | CODEOWNERS 身份有效、模板有验证与风险说明；dev/main 必需检查实际生效                                                                                                     |
| 11   | 清理 lint 警告、零警告门禁                           | 47 项目零警告与类型检查通过，待最终 CI     | 全仓 lint --max-warnings=0 通过；新增警告能使检查失败，不全局关闭规则                                                                                                    |
| 12   | bootstrap/doctor，新人快速启动                       | 待实施                                     | 版本与配置检查、不覆盖已有 .env、安全创建本地配置、启动 infra、db:init、显式开发 seed；隔离目录端到端计时，报告达到或未达到 10 分钟目标及条件                            |
| 13   | 拆分 AppShell 与 marketing skeleton 大文件           | 已提取导航同步并补回归，其余拆分待实施     | 按职责拆分、保持公开 API/页面行为；相关组件/路由测试、类型、lint 和页面 smoke 通过                                                                                       |

## 实施阶段

1. 建立基线，完成安装、规范、格式、flaky 与零警告治理；进行阶段代码审核。
2. 实现 dev/main 流水线、分组依赖/安全治理、仓库治理；验证失败关闭与部署隔离。
3. 实现完整模块 generator、跨层验证与覆盖率门槛，补组件/路由样板。
4. 迁移 Testcontainers 并补真实仓储集成测试，保留已有可靠消息回归。
5. 实现 bootstrap/doctor，拆分大型 UI 文件，完成新用户路径验收。
6. 逐项结项审查、本地完整矩阵、远端同一提交 CI，记录平台与部署限制。

阶段完成时追加实际审核发现、修复、执行命令和结果。任何未运行、缺环境或未通过
项目不能以配置存在、mock 通过或旧 CI 记录替代。本轮仅在所有要求有对应证据后结项。

## 部署决策与待补信息

- 用户指定 dev 为测试环境、main 为正式环境；正式部署必须使用经过验证的同一
  提交/产物。是否复用已有 CI 取决于提交身份，不能仅因为分支名为 main 就省略门禁。
- 当前 GitHub 未配置部署 Environment、变量或密钥；已向用户询问环境是否存在。
  无目标环境时先完成可验证机制与隔离演练，不擅自宣称真实部署通过。
- Testcontainers 为本轮明确要求，替换既有默认集成编排，避免新增两套维护路径。
- 保留已验证的移动原生缓存；本地先完成可复现检查，再集中触发必要远端矩阵。

## 阶段 1 进展（2026-09-30）

- 已按 120 列格式化仓库，将 workflow、Markdown 和 Prettier 配置纳入检查，
  排除生成的路由、Prisma、Native 工程和构建缓存。`nx format:check --all` 退出 0。
  CI 主检查已加入该命令，最终远端验收尚未执行。
- 基线 `lint-baseline.log` 记录 47 条 ESLint 警告。修复未使用符号、函数参数类型、
  非空断言、无用 Fragment 和 effect 依赖。Nx lint 统一传入 `--max-warnings=0`。
  JS redeclaration 规则不能区分 TypeScript 的值/类型命名空间，TS 文件改由必需的
  typecheck 检查重复声明，并保留 `no-unsafe-declaration-merging`。
- 真实负向验证：临时加入未使用变量，`email:lint` 因一条 warning 退出 1；
  临时加入重复 const 声明，`email:typecheck` 以 TS2451 退出 1。两份 fixture 已删除。
  结果见 `quality-gate-negative.json`，没有通过关闭所有 warning 或类型检查放行。
- AppShell 的路由同步提取为独立 hook，保留手动收起行为，新增 3 条导航回归通过。
  Studio 27、API client 27、Web 5、Mobile 6、Extension 9 条单测通过。
  首轮类型检查发现 calendar 的索引签名必须使用方括号，已修复并进入全仓复验。
- analytics-web 保留环境隔离与动态导入断言，超时上限调整为 15 秒，并明确配置根目录。
  `nx run analytics-web:test --skipNxCache --args=--no-cache` 在并发检查期间连续三轮
  通过，每轮 2 条测试，实际测试耗时约 1.03/2.11/1.27 秒，未配置 retries。
- wildcard 转换与修改前比较 6,220 组 pattern/separator，结果一致；Mongo `_id`
  规范化验证字符串、ObjectId、查询操作符、非法输入 4 条边界，并保持调用方 filter 不变。
  这是局部行为验证，不能替代第 7 项要求的真实数据库仓储集成测试。
- 官方 registry 扫描已实际失败并保存报告：46 个包涉及 high/critical 告警。
  干净目录中仅复制 manifest/lockfile 的扫描同样退出 1，未创建 node_modules。
  已添加扫描 workflow 和 Dependabot 分组配置；依赖修复、复扫和远端门禁仍未完成。
  具体边界见 [依赖治理](dependency-governance.md)。
- `@forkpath` 的账户和仓库 admin 权限已通过 GitHub API 验证，CODEOWNERS 和 PR 模板已添加。
  这些文件不等于独立审阅者批准；dev/main 保护仍需在分支策略阶段落实。

上述报告位于 `dist/test-results/hardening-20260930/`；完整阶段审核及后续阶段继续进行。

- 本轮干净副本复制 1,862 个源码文件，不复制 `.env` 或 node_modules，清除应用环境变量。
  `pnpm install --frozen-lockfile` 退出 0，耗时 234.18 秒，复用了本机 pnpm 下载缓存。
  随后 `extension:build` 因缺少 VITE_API_BASE_URL/VITE_URL 明确失败；安装修复没有放宽正式构建要求。
- 新 CI 格式步骤和独立安全工作流已通过 actionlint 1.7.12；二进制从官方 release
  下载并核对该版本校验和。Dependabot YAML 已解析，远端运行及更新 PR 尚待生效验证。

### 阶段 1 本地审核结论

47 个项目的 lint/typecheck/typecheck-tests 共 101 项任务全部通过，未复用 Nx 结果缓存，
耗时 14 分 2 秒。47 个 lint 入口均执行 `eslint . --max-warnings=0`，诊断为 0 error、
0 warning；Node/Vite 的工具迁移提示不属于 ESLint 诊断，仍按原日志保留。
格式负向实验也已通过：一份故意未格式化的临时文件使 `nx format:check` 退出 1，
报告指出正确文件，随后已删除。干净安装与正式扩展缺配置拒绝的临时副本已清理。

代码自审确认：兼容 helper 的参数/返回值推导保留，debounce 正确声明异步回调入口返回 void；
导航同步从 store 读取当时状态，避免为补 effect 依赖而破坏手动收起；Mongo 查询操作符与
ObjectId 不被误转换。主工作区暂存内容没有被本轮操作改写。

本阶段没有执行新的远端或原生 CI；最终同一提交的完整验收仍属于阶段 6。
未修复的依赖安全告警、生成器、Testcontainers、覆盖率门槛、bootstrap、剩余 UI 拆分及
分支部署仍是本 Goal 的必要后续工作，不能以本阶段通过提前结项。
