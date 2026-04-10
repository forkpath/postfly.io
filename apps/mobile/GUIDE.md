# Ray Mobile 开发指南

本文档覆盖 macOS 环境下 Expo (React Native) 移动应用的完整开发流程：环境准备、开发调试、构建打包、发布上架。

---

## 目录

- [1. 环境准备](#1-环境准备)
  - [1.1 基础工具](#11-基础工具)
  - [1.2 iOS 环境](#12-ios-环境)
  - [1.3 Android 环境](#13-android-环境)
  - [1.4 EAS CLI](#14-eas-cli)
- [2. 账号与证书](#2-账号与证书)
  - [2.1 Apple Developer（iOS 必需）](#21-apple-developeriOS-必需)
  - [2.2 Expo / EAS 账号](#22-expo--eas-账号)
  - [2.3 Google Play Console（Android 发布）](#23-google-play-consoleandroid-发布)
- [3. 项目结构](#3-项目结构)
- [4. 开发](#4-开发)
  - [4.1 启动 Metro Dev Server](#41-启动-metro-dev-server)
  - [4.2 iOS 模拟器开发](#42-ios-模拟器开发)
  - [4.3 Android 模拟器开发](#43-android-模拟器开发)
  - [4.4 真机开发](#44-真机开发)
- [5. 调试](#5-调试)
- [6. 构建](#6-构建)
  - [6.1 开发构建（Development Build）](#61-开发构建development-build)
  - [6.2 预览构建（Preview Build）](#62-预览构建preview-build)
  - [6.3 生产构建（Production Build）](#63-生产构建production-build)
  - [6.4 本地构建](#64-本地构建)
- [7. 发布](#7-发布)
  - [7.1 OTA 热更新](#71-ota-热更新)
  - [7.2 提交到应用商店](#72-提交到应用商店)
- [8. 常用命令速查](#8-常用命令速查)
- [9. 常见问题](#9-常见问题)

---

## 1. 环境准备

### 1.1 基础工具

```bash
# Node.js >= 22 + pnpm >= 10（项目根目录要求）
node -v  # v22.x
pnpm -v  # 10.x

# Watchman（Metro 文件监视，强烈推荐）
brew install watchman
```

### 1.2 iOS 环境

**必需**：macOS + Xcode

```bash
# 安装 Xcode（从 App Store 或 https://developer.apple.com/xcode/）
# 安装后运行：
sudo xcode-select --switch /Applications/Xcode.app
xcodebuild -runFirstLaunch

# 安装 Xcode Command Line Tools
xcode-select --install

# 安装 CocoaPods（iOS 依赖管理）
brew install cocoapods

# 验证
xcrun simctl list devices  # 列出可用的 iOS 模拟器
```

**模拟器**：Xcode 安装后自带。通过 Xcode → Settings → Platforms 下载额外的 iOS 版本。

**真机**：需要 Apple Developer 账号（见第 2 节）。

### 1.3 Android 环境

```bash
# 安装 Android Studio
brew install --cask android-studio

# 首次打开 Android Studio，完成 Setup Wizard，确保安装：
#   - Android SDK (API 35+)
#   - Android SDK Build-Tools
#   - Android SDK Platform-Tools
#   - Android Emulator
#   - Intel HAXM 或 Android Emulator Hypervisor Driver
```

配置环境变量（添加到 `~/.zshrc`）：

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**模拟器**：Android Studio → Device Manager → 创建 Virtual Device（推荐 Pixel 系列 + 最新 API）。

**真机**：USB 连接 → 开启开发者模式 → 开启 USB 调试。无需付费账号即可在真机调试。

### 1.4 EAS CLI

```bash
# 全局安装 EAS CLI（Expo Application Services）
npm install -g eas-cli

# 验证
eas --version
```

---

## 2. 账号与证书

### 2.1 Apple Developer（iOS 必需）

| 场景 | 是否需要付费账号 ($99/年) |
|------|--------------------------|
| iOS **模拟器**开发调试 | 不需要 |
| iOS **真机**开发调试 | 需要免费 Apple ID（Xcode 自动签名） |
| TestFlight 内测分发 | **需要**付费账号 |
| App Store 上架发布 | **需要**付费账号 |

**免费 Apple ID 真机调试**：Xcode → Settings → Accounts → 添加你的 Apple ID → 在项目签名中选择 Personal Team。限制：每 7 天需重新签名，最多 3 个设备。

**付费开发者账号注册**：https://developer.apple.com/programs/enroll/

### 2.2 Expo / EAS 账号

EAS 用于云端构建和 OTA 更新。

```bash
# 注册（免费，可在 https://expo.dev/signup）
eas login

# 关联项目（首次执行一次）
cd apps/mobile
eas init
```

**EAS 免费额度**：每月 15 次 iOS 构建 + 15 次 Android 构建。超出需付费套餐。

如果只用本地构建（`npx expo run:ios` / `npx expo run:android`），可以完全不用 EAS。

### 2.3 Google Play Console（Android 发布）

仅在提交到 Google Play 时需要。注册费 $25（一次性）。

https://play.google.com/console/signup

---

## 3. 项目结构

```
apps/mobile/
├── app.config.ts          # Expo 动态配置（bundleId, plugins 等）
├── eas.json               # EAS Build 构建配置（dev/preview/production）
├── metro.config.js         # Metro 打包器配置（monorepo 适配）
├── project.json           # Nx 项目元数据
├── tsconfig.json          # TypeScript 配置
├── package.json           # 依赖（Expo 生态独立管理）
└── src/
    ├── app/               # Expo Router 文件路由
    │   ├── _layout.tsx    # 根布局
    │   ├── index.tsx      # 入口/启动页
    │   ├── (setup)/       # 未登录流程（welcome, auth）
    │   └── (app)/         # 已登录流程（dashboard）
    └── lib/               # 工具模块
        ├── auth.ts        # 认证客户端
        ├── providers.tsx  # 全局 Provider 组合
        ├── env.ts         # 环境变量
        └── mobile-integrations.tsx  # 平台集成与适配器注册
```

---

## 4. 开发

### 4.1 启动 Metro Dev Server

```bash
# 从项目根目录
pnpm dev:mobile          # = nx run mobile:start

# 或直接在 apps/mobile 目录
pnpm dev                 # = expo start --clear
```

启动后终端会显示交互菜单，按对应按键选择平台：

- `i` — 打开 iOS 模拟器
- `a` — 打开 Android 模拟器
- `r` — 重新加载
- `j` — 打开 React DevTools

### 4.2 iOS 模拟器开发

```bash
# 方式 1：启动 dev server 后按 i
pnpm dev:mobile

# 方式 2：直接启动并打开 iOS 模拟器
pnpm mobile:ios          # = nx run mobile:run-ios

# 方式 3：Expo CLI
cd apps/mobile && npx expo start --ios
```

首次运行会在模拟器上安装 Expo Go 或 Development Build。

### 4.3 Android 模拟器开发

```bash
# 先启动 Android 模拟器（通过 Android Studio Device Manager）

# 方式 1：启动 dev server 后按 a
pnpm dev:mobile

# 方式 2：直接启动
pnpm mobile:android      # = nx run mobile:run-android
```

### 4.4 真机开发

#### iOS 真机

1. USB 连接 iPhone 到 Mac
2. iPhone → 设置 → 隐私与安全 → 开发者模式 → 打开
3. 信任此电脑

```bash
# 生成原生项目并在真机运行
cd apps/mobile
npx expo run:ios --device
# 选择你的设备（需要 Xcode 签名配置）
```

或使用 **Development Build**（推荐，功能更完整）：

```bash
# 云端构建 development client
eas build --profile development --platform ios
# 构建完成后通过二维码安装到真机
# 然后连接到本地 dev server
pnpm dev:mobile
```

#### Android 真机

1. USB 连接 Android 手机
2. 手机 → 开发者选项 → 开启 USB 调试
3. 允许 USB 调试授权

```bash
# 检查设备是否连接
adb devices

# 直接在真机运行
cd apps/mobile
npx expo run:android --device
```

---

## 5. 调试

### React DevTools

```bash
# 启动 dev server 后按 j，或单独安装
npx react-devtools
```

### Console 日志

- Metro 终端直接输出 `console.log`
- iOS 模拟器：Xcode → Debug → Open System Log
- Android：`adb logcat *:S ReactNative:V ReactNativeJS:V`

### 网络请求调试

- React Native Debugger 或 Flipper
- `console.log` 在 Metro 终端可见
- 开发时 API 地址通过 `EXPO_PUBLIC_API_BASE_URL` 环境变量配置（见 `eas.json`）

### TypeScript 类型检查

```bash
pnpm verify:mobile       # = nx run mobile:typecheck && nx run mobile:export
```

---

## 6. 构建

项目通过 `eas.json` 定义了三个构建配置：

| Profile | 用途 | 分发方式 |
|---------|------|----------|
| `development` | 开发调试（含 DevTools） | 内部（Ad Hoc / APK） |
| `preview` | 内测 / QA 测试 | 内部（Ad Hoc / APK） |
| `production` | 正式发布 | App Store / Google Play |

### 6.1 开发构建（Development Build）

包含完整的开发者工具（DevMenu, Inspector, DevTools）。安装到设备后可连接到本地 Metro dev server 进行实时开发。

```bash
# iOS（需要 Apple Developer 账号）
eas build --profile development --platform ios

# Android
eas build --profile development --platform android

# 双平台同时构建
eas build --profile development --platform all
```

### 6.2 预览构建（Preview Build）

接近生产环境的构建，用于内部测试。不含开发者工具。

```bash
# iOS — 生成 .ipa
eas build --profile preview --platform ios

# Android — 生成 .apk（可直接安装）
eas build --profile preview --platform android
```

### 6.3 生产构建（Production Build）

用于提交到应用商店的最终构建。

```bash
# iOS — 生成 .ipa（App Store 格式）
eas build --profile production --platform ios

# Android — 生成 .aab（Google Play 格式）
eas build --profile production --platform android
```

### 6.4 本地构建

不依赖 EAS 云端，在本机执行构建（需要完整的原生开发环境）：

```bash
# 生成原生项目
cd apps/mobile
npx expo prebuild --clean

# iOS 本地构建
npx expo run:ios --configuration Release

# Android 本地构建
npx expo run:android --variant release
```

也可通过 Nx：

```bash
nx run mobile:prebuild
nx run mobile:run-ios
nx run mobile:run-android
```

---

## 7. 发布

### 7.1 OTA 热更新

通过 EAS Update 推送 JS 层更新，用户无需重新下载应用。

```bash
# 推送更新到 preview channel
eas update --branch preview --message "fix: 修复登录页样式"

# 推送更新到 production channel
eas update --branch production --message "fix: 修复数据加载问题"
```

限制：OTA 只能更新 JS/资源层，不能更新原生代码（新增原生模块需要重新构建）。

### 7.2 提交到应用商店

```bash
# 提交最近一次 production 构建到 App Store Connect
eas submit --platform ios

# 提交到 Google Play Console
eas submit --platform android
```

或通过 Nx：

```bash
nx run mobile:submit
```

首次提交前需要：
- **iOS**：在 App Store Connect 创建 App 记录（bundleId: `com.ray.mobile`）
- **Android**：在 Google Play Console 创建应用

---

## 8. 常用命令速查

所有命令从 **项目根目录** 执行：

| 操作 | 命令 |
|------|------|
| 启动 dev server | `pnpm dev:mobile` |
| iOS 模拟器运行 | `pnpm mobile:ios` |
| Android 模拟器运行 | `pnpm mobile:android` |
| 类型检查 | `nx run mobile:typecheck` |
| 导出验证 | `nx run mobile:export` |
| 完整验证 | `pnpm verify:mobile` |
| 生成原生项目 | `nx run mobile:prebuild` |
| EAS 开发构建 | `eas build --profile development --platform all` |
| EAS 生产构建 | `eas build --profile production --platform all` |
| OTA 更新 | `eas update --branch production --message "描述"` |
| 提交商店 | `nx run mobile:submit` |
| 安装依赖 | `pnpm add <pkg> --filter mobile` |
| 查看项目 targets | `nx show project mobile` |

---

## 9. 常见问题

### Metro 启动报错 "Unable to resolve module"

```bash
# 清除 Metro 缓存
cd apps/mobile && npx expo start --clear
```

### iOS 模拟器构建失败

```bash
# 重新安装 Pod 依赖
cd apps/mobile/ios && pod install --repo-update

# 或重新生成原生项目
cd apps/mobile && npx expo prebuild --clean
```

### Android 模拟器未检测到

```bash
# 确认 adb 可用
adb devices
# 如果为空，重启 adb
adb kill-server && adb start-server
```

### 真机调试 "Untrusted Developer"

iOS → 设置 → 通用 → VPN与设备管理 → 信任开发者证书。

### monorepo 依赖解析问题

```bash
# 确保 workspace 依赖已安装
pnpm install

# 添加新的 Expo 兼容依赖
cd apps/mobile && npx expo install <package-name>
```

`expo install` 会自动选择与当前 Expo SDK 兼容的版本。
