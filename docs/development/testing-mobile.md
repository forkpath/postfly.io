# Mobile 设备测试

Mobile 的快速组件与路由测试使用 `pnpm nx run mobile:test`。设备测试使用
Maestro，运行编入 JS bundle 的原生 Release 测试包：

```sh
node scripts/testing/install-maestro.mjs
pnpm nx run mobile:e2e:android
pnpm nx run mobile:e2e:ios
```

安装脚本下载固定版本并校验 SHA-256，只写仓库 `.cache/testing-tools`，不会
更改系统 Maestro。已有相同版本可用 `RAY_MAESTRO_BIN` 指定可执行文件。
固定版本和设备配置见 `scripts/testing/mobile-tools.json`。

## 系统前置条件

- Node/pnpm 使用根 `package.json` 锁定版本，先完成冻结锁文件安装。
- Java 21，设置 `JAVA_HOME` 并确认 `java -version`。
- Android SDK、platform-tools、emulator、command-line tools；设置
  `ANDROID_HOME`。原生 SDK/NDK 版本由锁定的 Expo/React Native 构建配置决定。
  设备镜像为 Android 35 / Google APIs / revision 9，Intel 使用 `x86_64`，
  Apple Silicon 使用 `arm64-v8a`。例如使用已安装的 SDK 管理器安装
  `system-images;android-35;google_apis;x86_64`。需要可用的硬件虚拟化。
  构建前检查硬件加速，并记录 SDK 中已安装的 emulator 版本。
- iOS 需要 macOS、Xcode 26.6、CocoaPods，以及配置文件指定的 iOS 26.5
  Simulator runtime。测试构建关闭代码签名，不要求商店证书。

Expo 57 的官方最低要求是 Xcode 26.4；本套件固定到 GitHub `macos-26`
已提供的 Xcode 26.6 / iOS 26.5。可用 `DEVELOPER_DIR` 选择并行安装的
Xcode。旧工具链会在构建前明确失败，不修改依赖源码绕过编译器要求。
参见 [Expo 兼容表](https://docs.expo.dev/versions/latest/) 和
[GitHub runner 清单](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md)。

缺少工具、版本不匹配或原生构建失败会返回非零并留下报告，不能作为设备通过。
本地构建不要求 EAS 订阅；`eas.json` 同时提供 `e2e` profile，供使用者接入
EAS 构建。云端生成的包需要匹配其 `127.0.0.1:4179` 测试服务；默认本地
入口使用每次运行分配的端口并自动编排整个生命周期。

## 隔离和验收范围

runner 把当前 Git 跟踪及未忽略的 Mobile/共享库源码复制到临时目录，不复制
`.env`；根目录只复制包管理、Nx 与 TS 路径配置，在副本生成 native 工程。
依赖使用已安装的锁定包。正式工作区的
`ios/`、`android/` 和应用配置不会被 prebuild 改写。
默认 Expo Router 入口在副本内包装为本地入口，仍加载真实 `expo-router/entry`，
避免原生打包从副本外的依赖路径启动而遗漏页面。Android 先生成内嵌 bundle，
检查 sourcemap 包含布局、欢迎页和登录页，再编译应用 APK；缺失任何页面均失败。

测试应用是 `com.ray.mobile.e2e` / `Ray E2E`，scheme 为 `ray-e2e`，OTA 关闭。
正式应用仍使用原来的标识和更新配置。测试包允许 HTTP 以连接本机 fixture，不添加
认证绕过逻辑。外部 fixture 返回未登录 session；原生存储、Provider、字体、
Expo Router 和页面交互照常运行。它不验证登录服务本身、OAuth、支付、推送、
签名或真机硬件；后端身份验证由 Engine/Pulse 的真实协议套件负责。

每次运行创建自己的模拟器，安装测试包、重置状态、执行 flows，然后停止和
删除自己的设备/临时目录。不会重置开发者已有模拟器或已安装的正式应用。
Android 通过指定设备的 `adb reverse` 连接临时 fixture。所有等待均有截止时间。
原生构建最多等待 60 分钟，Android 启用 Gradle 自身按输入计算的 build cache，
并限制两个 Gradle worker。测试构建进程最多使用 4 GB Java 堆和 1 GB 元空间，
建议至少 8 GB 可用系统内存；这些参数只传给隔离测试构建。CI 的完整设备 job
最多 90 分钟。Android job 配置了 setup-java 的 Gradle 缓存，以锁文件、Mobile
配置、工具版本、测试 runner 与工作流共同计算 key，原生构建输入变化会更新缓存。
Android 使用软件图形渲染，macOS 关闭 Vulkan 以兼容本机 emulator；首次启动
最多等待 10 分钟。确认设备归本次运行所有后即采集失败日志，包括系统启动超时。

报告目录为 `dist/test-results/mobile/e2e/<platform>/<run-id>/`，含构建日志、
JUnit、Maestro 诊断、截图、测试产物、bundle 页面检查、fixture 请求记录和 `run.json`。CI 应
始终上传报告。成功标准是原生构建、安装、非零流程、fixture 访问与清理均通过；
单独 YAML 语法检查或 JS export 不属于设备验收。

## 添加自己的流程

在 `apps/mobile/.maestro/` 增加 YAML。当前示例验证启动、页面往返和冷启动
深链接参数；选择器使用实际组件的 `testID`，不使用屏幕坐标。复用已有框架
页面，为新业务增加自己的数据准备与可观察断言。复杂准备逻辑放在 Node
编排或后端 fixture 中，不在 YAML 内实现业务逻辑。

必须包含真正的失败断言；不要用 `optional: true` 掩盖核心路径失败。需要
第三方集成的专项测试单独显式启用，缺少前置条件时明确报告，不能悄悄当作通过。

当前实际平台结果见 [阶段验收记录](testing-framework-validation.md)。
