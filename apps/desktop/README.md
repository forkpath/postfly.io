# desktop

## 用途

Electron 桌面应用，main/preload 使用 Node/Electron，renderer 使用共享 Web/Studio 页面。当前 Nx 单项目标 runtime:web，是共享依赖边界，不是所有文件都纯浏览器。

## Tags、使用者与场景

`type:app` · `runtime:web` · `domain:composition`。

桌面最终用户；业务 UI 消费 Web 库，主进程能力经明确 IPC/preload 边界暴露。其他项目不得导入 app。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 开发、构建与发布

桌面使用 Vite 8 构建 main/preload/renderer，electron-builder 26.15.3 打包，electron-updater 6.8.9 更新。工作区使用 pnpm 默认 isolated 布局，不再应用 builder 收集器补丁。桌面运行依赖仅 Sentry 和 updater，renderer 库在构建时打入 bundle。

```sh
pnpm dev:desktop
pnpm nx run desktop:build
pnpm nx run desktop:package-dir
pnpm nx run desktop:package
```

开发脚本等待 renderer 服务与 main/preload 首次构建，main/preload 变化会重启 Electron。Ctrl+C 回收全部进程。正式包使用 file:// 与 hash 路由，不读取 DESKTOP_DEV_URL。构建产物在 `.vite`，安装包在 `dist/desktop/<local|test|release>/<darwin|win32>/<arch>`。

macOS 生成 DMG 和更新必需的 ZIP；Windows 生成每用户 NSIS，支持安装目录选择，卸载默认保留用户数据。当前不支持 Linux 发布。图标来自共享 Ray logo；`build-resources` 内 PNG/ICO/ICNS 为提交的发布资源。

### 配置与凭据

- `DESKTOP_PORT`：开发端口，默认 4200。
- `VITE_URL`、`VITE_API_BASE_URL`、`VITE_API_ENDPOINT`：renderer 站点/API/认证地址；file:// 应用须使用可访问的绝对地址。
- `VITE_SENTRY_DESKTOP_DSN`、`VITE_SENTRY_ENVIRONMENT`：允许公开，构建时注入主进程；不依赖用户电脑的环境变量。
- `DESKTOP_UPDATE_BASE_URL`：公开 HTTPS 更新根地址，如 `https://downloads.example.com/ray`。不能包含用户名、密码、查询或 fragment；生产地址不可使用 HTTP。
- `DESKTOP_ARCH`：macOS arm64/x64，Windows x64。`DESKTOP_PROFILE` 默认 local，test 只用于测试，release 由发布命令选择。
- `CSC_LINK`、`CSC_KEY_PASSWORD`：macOS Developer ID 签名证书及密码；`APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`：公证凭据。
- `WIN_CSC_LINK`、`WIN_CSC_KEY_PASSWORD`、`DESKTOP_WIN_PUBLISHER`：Windows 签名证书、密码、准确匹配证书的发布者名。
- `DESKTOP_S3_ENDPOINT`、`DESKTOP_S3_REGION`、`DESKTOP_S3_BUCKET`、`DESKTOP_S3_PREFIX`、`DESKTOP_S3_PATH_STYLE`：发布存储配置。endpoint 留空使用 AWS，兼容存储可设置 endpoint 与 path-style=true。
- `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`（必要时 `AWS_SESSION_TOKEN`）：仅上传进程使用。桶对外读取通过 CDN/HTTPS 完成，客户端不携带上传密钥。

`DESKTOP_UPDATE_BASE_URL` 必须映射到桶的 `DESKTOP_S3_PREFIX`。例如 URL `/ray` 对应 prefix `ray`，其下生成 `stable/darwin/arm64/latest-mac.yml` 等；每个平台/架构单独目录。配置缺失的普通包显示“未配置更新”，不发请求；release 缺少 URL/签名凭据直接失败。

Electron 下载默认使用官方源；需要镜像时仅为命令设置 `ELECTRON_MIRROR`。不要使用 NODE*OPTIONS 注入镜像，也不要将签名/上传凭据放进 VITE* 变量。

### 发布流程

使用 desktop package 的稳定 semver；创建匹配的 `desktop-vX.Y.Z` 标签，手动运行 Release Desktop。配置 GitHub `desktop-release` environment 的 variables/secrets；工作流中 DESKTOP_MAC_CSC_LINK / DESKTOP_MAC_CSC_KEY_PASSWORD 与 DESKTOP_WIN_CSC_LINK / DESKTOP_WIN_CSC_KEY_PASSWORD 映射到上述 builder 变量。

工作流先在三个原生 runner 构建、签名、公证并做正式包 smoke，全部成功才汇总到上传 job。`desktop:release` 仅产生签名文件与 release.json，`desktop:publish` 验证三目标版本、URL、产物 SHA512 后上传。公开发布不会因普通 build/package 自动发生。

安装文件名称含版本；上传器拒绝覆盖内容不同的同名安装文件。全部二进制上传并读回比对成功后才上传清单。二进制设 immutable 缓存，清单 no-cache/no-store。不同架构的清单更新不是跨对象原子事务；清单上传中断时已晋级架构可见新版本，未晋级架构仍使用旧版本。重试相同 release 可继续完成。

保留旧安装文件。撤回清单只阻止后续升级，不会将已更新用户降级；客户端禁用自动降级。不要删除仍被任何清单引用的文件。首次公开发布前必须人工完成签名安装和 A→B 升级验收。

### 更新行为与安全边界

正式应用窗口就绪 10 秒后自动检查，此后每六小时检查一次；用户可通过右下角“应用更新”手动检查。下载及重启安装分别要求用户点击，退出不会自动安装。网络错误不影响业务启动，检查/下载去重，错误可重试。未下载完成时安装调用无效。

`window.electronAPI.updates` 提供 getState/check/download/install/onStateChange；只允许当前窗口主 frame 的受信页面调用，不接受下载 URL 或任意文件参数。renderer 不可导入 Node/updater。窗口关闭时释放 IPC 订阅；应用退出时释放定时器。

### 测试

```sh
pnpm nx run-many -t lint,typecheck,test,build -p desktop
pnpm nx run desktop:e2e
pnpm nx run desktop:smoke
pnpm nx run desktop:update-e2e
pnpm ci:nx-cache-contracts
```

- Vitest 覆盖状态机、失败重试、并发去重、IPC 来源与清理、界面动作、发布校验和上传顺序。
- e2e 在独立测试包运行 Playwright Electron，检查 hash 登录路由/刷新、preload、窗口 IPC 和更新面板；仅该 profile 开启调试 Fuse。认证 API 使用测试响应。
- smoke 将正式安全配置的本地包复制到临时目录启动，检查 ASAR、Fuses、生产依赖与固定就绪报告。`--desktop-smoke` 只写 userData/desktop-smoke.json 的固定事实，随后退出，不接受页面或代码输入。
- update-e2e 生成 0.1.0/0.1.1 测试包，通过本地 HTTP 验证 404、断网、确认后下载、校验失败与重试。Windows 实际安装 A、升级到 B 并重新启动，核对版本与原有 userData，最后停止本次测试进程并清理安装目录和缓存；macOS 未签名环境只验证真实检查和下载。
- macOS 完整安装升级必须使用同一 Developer ID 签名、公证的 A/B 版本和 staging HTTPS 更新源，检查 B 的版本、重启以及原有 userData。无签名凭据不能宣称通过此项。

测试 profile 使用独立应用标识、更新缓存和快捷方式名称；Windows 测试安装不创建桌面或开始菜单快捷方式，避免覆盖或启动正式应用的同名入口。正式安装配置保持不变。

macOS 的 smoke、e2e 和 update-e2e 只对临时用户目录传入 `--use-mock-keychain`，避免未签名测试包读取开发者钥匙串并等待系统授权。该参数由测试脚本传入，不写入应用或发布配置；smoke 仍检查正式 Fuse 配置，但这些自动化结果不证明真实钥匙串访问或 Cookie 加密兼容性。做签名发布验收时，应正常启动应用另行验证。此隔离方式与 [Electron 官方测试](https://releases.electronjs.org/pr/53790)一致。

e2e 与 update-e2e 使用同一测试打包目录，当前应顺序执行。

报告与失败截图位于 `dist/desktop/test-results`。CI 包含 macOS arm64/x64、Windows x64，以及 Linux 上的 MinIO 集成测试。普通测试包与真实发布包严格分目录。

本地 MinIO（仅测试凭据）：

```sh
docker run --rm -d --name ray-minio -p 9000:9000 -e MINIO_ROOT_USER=ray-test -e MINIO_ROOT_PASSWORD=ray-test-password ghcr.io/coollabsio/minio:RELEASE.2025-04-22T22-12-26Z@sha256:a4938f37f1be1841b8e7b627ad0207b265345fd0d063e42d7410c78af0e63e68 server /data
DESKTOP_S3_ENDPOINT=http://127.0.0.1:9000 DESKTOP_S3_BUCKET=ray-desktop-test AWS_ACCESS_KEY_ID=ray-test AWS_SECRET_ACCESS_KEY=ray-test-password pnpm nx run desktop:publish-test
docker stop ray-minio
```

测试仅操作随机 integration/ 前缀并清理测试对象。正式 bucket 不用于集成测试。Docker、签名凭据或平台 runner 不可用时，将相应项目作为阻塞项报告，不把跳过当成通过。

### pnpm 隔离安装

配置集中在 `pnpm-workspace.yaml`，使用 isolated 依赖布局。Builder 以 desktop 为项目根，只带入该包声明的生产依赖。共享 Native 源码库由根 package 管理，根与 mobile 各自声明所需依赖，通过 catalog 对齐版本。

桌面 renderer 的打包入口是 `file://`，认证 API 不能使用网页的同源回退。构建时采用 `VITE_API_ENDPOINT`，其次 `VITE_API_BASE_URL`；本地默认 `http://localhost:8000`。正式构建必须显式提供生产 HTTPS API 地址，且后端需要允许桌面客户端的认证来源。测试会拦截认证请求并返回未登录响应。
