# 框架测试实施验收记录

本文记录实际执行结果，不能以配置文件存在代替运行验收。当前工作基于已有未提交改动；没有发布应用，也没有修改生产数据库。

## 阶段 1：单测入口与 Extension（2026-09-28）

交付 Mobile 的 Expo 57 / Jest 29 / RN Testing Library 14 入口，Extension 与 Web 的独立 Vitest 入口、测试类型检查，以及标准 Extension Playwright fixture。`test` 默认执行后退出；`extension:smoke` 保留，验证生产配置构建，`extension:e2e` 使用独立测试产物。

| 检查 | 实际结果 |
| --- | --- |
| Mobile 单测 | 3 个文件、6 个用例通过：原生按钮、剪贴板正反结果、路由和深链接 |
| Extension 单测 | 3 个文件、9 个用例通过：消息、存储、错误边界 |
| Web 单测 | 2 个文件、5 个用例通过：会话身份同步、定时器生命周期 |
| 测试类型 | 三个 `typecheck-tests` 通过 |
| 应用类型 | 三个应用及 20 个依赖任务通过 |
| Lint | 三个应用通过，仍有原有警告；没有新增错误 |
| Chromium Extension E2E | 7 个用例通过：五个页面与真实 background messaging、content script、storage |
| 干净安装 | 仓库外复制 1785 个源码文件，不复制 `.env` 或 `node_modules`；冻结锁文件安装通过 |
| 干净副本单测 | 清除应用／服务环境变量后，三个 Nx 入口共 20 个用例通过，正常退出 |
| 负向单测验收 | 在独立副本破坏剪贴板状态、逐字显示、存储竞争保护；三组测试均检测到预期断言失败并退出 1，随后还原源码 |
| 负向 E2E 验收 | 故意破坏 content script 交互断言；退出 1，生成 trace／失败截图，临时浏览器 profile 全部清理 |
| 正式构建门禁 | 缺少站点/API URL 的正式扩展构建仍明确失败，不会沿用测试地址 |

执行入口：

```sh
pnpm nx run-many -t test,typecheck-tests -p mobile,web,extension --skipNxCache
pnpm nx run-many -t typecheck -p mobile,extension,web --skipNxCache
pnpm nx run-many -t lint -p mobile,web,extension --skipNxCache
pnpm nx run extension:e2e --skipNxCache
```

代码审查及修正：

- 扩展主题初始化读取存在竞争：晚到的旧值覆盖最新写入。现在监听变化后拒绝旧快照，卸载后不再更新，读取失败保留 fallback 并记录错误；有确定性的延迟读取回归用例。
- WXT 类型准备依赖部署 URL，导致新用户无 `.env` 时安装失败。仅 `prepare` 免除端点与权限推导，正式构建继续要求有效配置；独立副本验证了正反结果。
- 测试配置不启动 Web 生产构建插件，也不启动会读取环境文件的 WXT 测试插件；直接使用 WXT 官方 fake browser。路径映射复用项目 tsconfig，兼容当前 Vite 8 与 Vitest 4.0 的 Vite 7 类型边界。
- 扩展 fixture 在成功、失败、截图／trace 处理异常时均进入浏览器关闭与目录清理；测试产物不会进入 Git 或 ESLint 扫描。
- SettingsTile 增加原生按钮角色，交互测试同时验证可用与禁用状态。
- 一次并行高负载运行出现 Jest worker 退出提示；专项 `--detectOpenHandles --runInBand` 和干净副本复跑均正常结束，无遗留句柄报告。冷启动路由套件需要转换较多 Expo 模块。

边界：Mobile 的这些用例运行于 Jest，尚不是模拟器 E2E；Firefox 尚未执行真实扩展加载；签名、商店上传和 CI 分支规则不在本阶段通过范围。具体新增用例方式见 [测试指南](testing.md)。

## 阶段 2：后端隔离环境与真实协议（本地已验收）

提供按套件裁剪的临时 Docker Compose 环境、唯一命名空间、迁移、报告与清理。Node 专用共享 fixture 位于 `libs/testing-server`，有真实 Engine/Pulse 消费者；Nx 边界和生产源码导入限制保持启用。

| 检查 | 实际结果 |
| --- | --- |
| Engine HTTP E2E | 5 用例通过：完整启动、真实登录与角色、实际用户/组织计费路径、非法 DTO、领域错误映射 |
| Engine 集成 | 2 用例通过：PG 身份与组织约束、真实 Redis Cache TTL/读写/删除 |
| Pulse ws E2E | 7 用例通过：缺少身份、非法协议、组织授权、双实例 Redis 分发、drain、成员移除、撤销已连接会话 |
| Pulse Redis 集成 | 1 用例通过：真实 Redis 数据与过期 |
| Worker E2E | 6 用例通过：完整模块启动、重复投递、真实 TTL 重试、最后一次失败/DLQ、活动租约重投、杀进程再重启恢复 |
| Worker PG 集成 | 1 用例通过：八个并发认领、租约恢复、旧处理者不能覆盖新状态 |
| 快速测试与类型 | Engine/Pulse/Worker 及 server-nest/server-redis 单测通过；三服务测试类型、应用类型和 lint 通过；隔离环境 guard 的 11 个正反用例通过 |
| 正式构建 | 三服务正式 Webpack 构建通过；Worker 子进程 fixture 使用相同编译器与解析机制 |
| 中断清理 | 实际启动 PG 后向 runner 发送 SIGTERM，退出 1；报告 interrupted=true、cleaned=true，容器和网络删除 |
| 失败清理 | 协议、DTO、租约和子进程加载的真实失败均返回非零并保留报告，失败环境已清理 |

阶段代码审查发现并修复：

- Engine 的 Zod 全局 pipe factory 原先返回类而非实例，非法请求进入业务层；真实 HTTP 用例先失败，修复后返回 400。
- 当前 Nest cache-manager 与 ESM Keyv 包装不兼容，完整服务不能启动；改用受支持的 Redis store adapter，真实 TTL/序列化断言通过。
- Pulse 对合法 JSON `null` 和畸形 Redis 消息处理不完整；增加协议 schema、Domain port/Application Use Case、持久会话和组织授权复查，清理订阅监听器与连接任务。
- Worker 将活动租约的重投直接 ack，可能丢失崩溃后的消息；改为确认延迟副本后 ack。认领次数约束状态写入，防止旧处理者覆盖新租约。真实进程恢复通过。
- 测试启动关闭 Nest/Vite/Nx/dotenv 的环境文件加载；fixture 写入前再次检查本机测试数据库命名。日志遮蔽认证请求头与 cookie；i18n 接受绝对目录，非开发环境不写类型文件。
- 测试子进程直接使用临时 TS loader 无法处理项目已有模块解析约定，改用正式 Webpack 编译器。测试入口不进入生产构建。
- 二次审查确认 `pg` 的连接字符串查询参数可以覆盖 URL 主机或端口。fixture guard 现在只接受带明确端口、无查询参数和片段的本机 runner 地址；11 个正反用例、类型检查与 lint 通过，避免表面为 loopback 的连接指向其他环境。

可追溯报告示例：Engine `caed68bcd05ff0e8`，Pulse `1ae62adb139b997b`，Worker `bad6f4253953fffd`，中断验证 `7e907b21869426b9`。报告位于 `dist/test-results/<project>/<suite>/<run-id>/`。新增计费路径用例首次因未启用组织计费返回 403；修正测试环境的显式功能开关后 5 项通过，没有改变生产默认配置。

边界：本地宿主为 macOS，基础设施运行于 Linux 容器；尚未取得 Linux GitHub Actions 通过记录，因此阶段 2 的远端验收留到阶段 4。DLQ 用例从最后一次重试开始，未声称整条五次退避链已执行。测试缩短单条 fixture 的租约等待；生产五分钟租约保持不变。外部副作用仍需业务幂等键。

## 阶段 3：Mobile 设备入口（平台验收进行中）

已交付独立应用标识、内嵌 JS Release 构建、Maestro 两条流程、固定工具下载校验、
临时源码副本、专用模拟器与失败报告。YAML 语法检查通过；中断清理 helper 的
真实父进程/脱离进程组子进程测试通过，并确认不会停止不相关进程。

iOS 已实际完成 prebuild/Pods 并执行原生编译，报告 `ca7c6525e10142c1`。
本机 Xcode 26.3 在 Expo 57 的 `RuntimeScheduler.h` Swift ownership 注解处失败；
Expo 官方最低要求为 Xcode 26.4。现已固定 Xcode 26.6 / iOS 26.5，与 GitHub
macos-26 runner 对齐。重新运行前置检查报告 `963a1a8ab67c1621` 明确退出 1，
`cleaned=true`。本机未完成 iOS 安装或 Maestro 流程，不能计作通过。

Android 首次原生构建触及初始 45 分钟上限，报告 `dfe33d713db4c7e9` 为 `passed=false, cleaned=true`。第二次运行 `62e9104867b30faf` 进入 R8/原生 lint 后，2 GB 堆和 512 MB 元空间持续接近耗尽，诊断记录了 159 次 full GC、约 8.5 分钟 full GC 时间；主动中断后 `passed=false, cleaned=true, interrupted=true`，所属 Gradle/Kotlin 进程均退出。调整为 4 GB 堆、1 GB 元空间和 Gradle build cache 后，第三次 `e212791da4518c87` 原生编译成功（34 分 23 秒），但模拟器在 Vulkan 初始化时退出，整体仍为 `passed=false, cleaned=true`。

第三次 APK 的后续审查还发现内嵌 bundle 只有 Router 运行库，缺少应用页面。临时目录内的入口包装修复后，真实 `expo export:embed` 包含 6001 个模块、6008 个 sourcemap 来源，欢迎页、登录页和 fixture 地址均存在；这仍只是打包验证。现已增加原生 bundle 的页面完整性门禁，并按“bundle 检查 → 应用 APK”顺序构建。模拟器改为当前支持的软件图形模式，macOS 关闭 Vulkan，已越过此前退出点，但独立启动诊断 5 分钟尚未完成。第四次完整 Android 设备运行正在验证，未计作 E2E 通过。两个平台均不等于真机或商店包验收。

## 阶段 4：CI/CD 门禁（已实现，本地与远端验收进行中）

已增加 affected 选择、统一失败汇总、后端/扩展/Web/设备/Desktop job 和报告上传；
修复只覆盖 dev/main 而遗漏实际 arch 默认分支的问题。发布工作流复用同一 SHA
的完整 CI，扩展测试解压的待发布 ZIP，服务在推送前启动实际镜像，并核对镜像 ID。
部署后运行无业务写入的公开页面/HTTP/WS 探针。

本地已验证 25 项 CI 合约测试；涵盖套件选择、缺失/失败结果拒绝、真实网络探针
正反例、镜像替换/失败报告拒绝、进程树清理以及 Mobile bundle 页面缺失拒绝。发布命令负向演练返回非零，记录命令没有收到 push。actionlint 1.7.12 已检查工作流语法与引用。

正式 Chrome ZIP 在无 `.env` 的独立副本构建，再解压运行 `extension:e2e-artifact`，7 项真实浏览器用例通过；ZIP SHA-256 为 `27b9bf4f83fa5d8f14cffdf4a8c001222fcdf4f09733b7e38adc6c7dd5e91b9e`。Mobile、Extension、Web E2E 的 lint/typecheck 及 21 个依赖任务全部通过。四个应用的 build/package 共 7 个任务也通过；Web 正式构建的 Chromium/Firefox/WebKit 三个页面用例通过。Desktop 在无环境文件的独立副本执行 28 个单测、正式构建、无签名打包和 Electron E2E，验证更新窗口、preload、路由重载、窗口 IPC 与断网后界面可用，3 个 Nx 任务通过；该记录仅覆盖本机 macOS x64，不代表 Windows、macOS ARM 或签名升级已经通过。

真实镜像构建发现 Nx 精简锁文件与复制进去的整个 workspace overrides 不一致，冻结安装失败。服务镜像改为安装 Nx 已解析的独立 runtime manifest/lockfile，保留冻结安装；修复后 Engine/Pulse/Worker 冻结安装与五个镜像构建全部通过。使用同一组镜像执行真实迁移、四个应用健康检查、公开 HTML、匿名会话、受保护 HTTP 401 和 WebSocket 4401 检查，报告 `25f061b7d09f6804` 为 `passed=true, cleaned=true, interrupted=false`，退出 0；容器与网络已删除。检查记录对应本地代码快照 `5bbdf7160dc70287c10a84f3c62b39e8b63cd1bc`，没有推送镜像或部署生产环境。

查询远端现有定时 CI 的失败日志，确认冻结安装失败于 Extension WXT prepare 的
Invalid URL；阶段 1 的无环境安装修复直接覆盖该原因。该旧运行不能代表新配置结果。

仓库默认分支 arch 当前 `protected=false`；rulesets API 返回 403，说明私有仓库
需要 GitHub 方案支持。没有修改订阅或可见性，也没有据此声称合并保护已经生效。

## 尚未完成的验收

- 阶段 2：本地真实协议、持久化及中断清理通过，Linux CI 验收待完成。
- 阶段 3：Android 原生编译已成功，设备启动与 bundle 完整性修复后的完整流程仍在验证；iOS 本机工具链阻碍，远端设备流程待验证。
- 阶段 4：新配置的真实 PR、Linux/跨平台结果和远端合并阻断待验证；镜像构建、启动及发布前探针已在本地通过。
