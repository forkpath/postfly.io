# Ray Browser Extension 开发指南

## 目录

- [环境准备](#环境准备)
- [依赖安装](#依赖安装)
- [环境变量](#环境变量)
- [开发调试](#开发调试)
- [项目结构](#项目结构)
- [架构说明](#架构说明)
- [生产打包](#生产打包)
- [发布流程](#发布流程)
- [常见问题](#常见问题)

## 环境准备

### 系统要求

| 工具 | 版本要求 |
|------|----------|
| Node.js | >= 22.19.0 |
| pnpm | >= 10.8.1 |
| Chrome | 最新稳定版（用于开发和调试） |
| Firefox | 最新稳定版（可选，用于 Firefox 扩展开发） |

### 前置条件

1. 确保已安装 Node.js 和 pnpm，版本符合上述要求
2. 克隆 Ray monorepo 仓库
3. Chrome 已安装并可启动

## 依赖安装

在 monorepo 根目录执行：

```bash
pnpm install
```

安装过程中会自动触发 `postinstall` 脚本运行 `wxt prepare`，生成 WXT 类型声明文件（`.wxt/` 目录）。

如果需要单独重新生成类型：

```bash
cd apps/extension
npx wxt prepare
```

## 环境变量

在 monorepo 根目录创建 `.env` 文件，配置以下变量：

```env
# 必需
VITE_SITE_URL=http://localhost:3000        # 后端 API / 认证服务地址
VITE_PRODUCT_NAME=Ray                      # 扩展在 manifest 中的名称
VITE_DEFAULT_LOCALE=en                     # 默认语言（en | zh）

# 主题
VITE_THEME_MODE=system                     # 主题模式（light | dark | system）
VITE_THEME_COLOR=orange                    # 主题色

# Analytics（可选）
VITE_POSTHOG_KEY=                          # PostHog 项目 API Key
VITE_POSTHOG_HOST=https://us.i.posthog.com # PostHog 实例地址

# Monitoring（可选）
VITE_SENTRY_DSN=                           # Sentry DSN
VITE_SENTRY_ENVIRONMENT=development        # Sentry 环境标识
```

> 所有 `VITE_` 前缀的环境变量会通过 Vite 的 `import.meta.env` 注入到扩展代码中。

## 开发调试

### 启动开发服务器

在 monorepo 根目录：

```bash
# Chrome（默认）
pnpm dev:extension

# 等价于
nx run extension:dev

# Firefox
nx run extension:dev-firefox
```

WXT 开发服务器启动后会：
1. 编译扩展代码到 `apps/extension/build/chrome-mv3-dev/`
2. 启动 Vite HMR 服务器（默认端口 1234）
3. 自动监听文件变更并热重载

### 加载扩展到 Chrome

1. 打开 Chrome，导航到 `chrome://extensions/`
2. 开启右上角的 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择目录：`apps/extension/build/chrome-mv3-dev/`
5. 扩展将出现在扩展列表中

### 加载扩展到 Firefox

1. 打开 Firefox，导航到 `about:debugging#/runtime/this-firefox`
2. 点击 **临时载入附加组件...**
3. 选择文件：`apps/extension/build/firefox-mv3-dev/manifest.json`

### 调试技巧

#### Background Service Worker

1. 在 `chrome://extensions/` 中找到 Ray 扩展
2. 点击 **Service Worker** 链接
3. 打开 DevTools 进行调试

#### Popup / SidePanel / Options 页面

1. 右键点击扩展图标，选择 **审查弹出内容**
2. 或在扩展页面按 `F12` 打开 DevTools

#### Content Script

1. 在目标网页按 `F12` 打开 DevTools
2. 在 Sources 面板中找到 `content-scripts/` 下的脚本
3. 设置断点进行调试

#### HMR（热重载）

- **popup / sidepanel / options / tabs** 等页面：支持 HMR，代码修改后自动刷新
- **background service worker**：修改后需要在 `chrome://extensions/` 中点击扩展的刷新按钮
- **content script**：修改后需要刷新目标页面
- **manifest 变更**（权限等）：需要在 `chrome://extensions/` 中移除并重新加载扩展

## 项目结构

```
apps/extension/
├── project.json          # Nx 项目配置（targets: dev, build-chrome, build-firefox, typecheck）
├── package.json          # WXT 专有依赖（wxt, @wxt-dev/*, @webext-core/*）
├── wxt.config.ts         # WXT 构建配置（Vite 插件, manifest, 入口目录）
├── tsconfig.json         # TypeScript 配置（继承 tsconfig.base.json, @libs/* 路径）
├── GUIDE.md              # 本文档
├── build/                # 构建产物（git-ignored）
├── .wxt/                 # WXT 生成的类型声明（git-ignored）
└── src/
    ├── config/
    │   └── app.ts        # 环境变量读取, appConfig 全局配置
    ├── assets/
    │   └── styles/
    │       └── globals.css   # Tailwind + 全局样式
    ├── lib/
    │   ├── api/          # API 客户端（@libs/api-client + @libs/api-core）
    │   ├── auth/         # 认证客户端（@libs/auth/client/web）
    │   ├── i18n/         # 国际化（@libs/i18n + browser.cookies）
    │   ├── messaging/    # 扩展消息传递（@webext-core/messaging）
    │   ├── query.tsx     # React Query 客户端配置
    │   ├── storage/      # WXT Storage 持久化（主题等）
    │   ├── analytics/    # PostHog 具体实现
    │   ├── monitoring/   # PostHog/Sentry 具体实现
    │   └── providers/    # React 上下文 Provider 聚合
    ├── modules/
    │   ├── common/       # 通用 UI（Layout, Theme, Toast, ErrorBoundary）
    │   ├── user/         # 用户导航、登出
    │   └── billing/      # 账单 API 封装
    └── app/              # WXT 入口点（entrypoints）
        ├── background/   # Service Worker（消息处理）
        ├── content/      # 注入页面的脚本
        ├── popup/        # 弹出窗口
        ├── sidepanel/    # 侧边栏
        ├── options/      # 设置页
        ├── tabs/         # 自定义标签页
        ├── newtab/       # 新标签页
        └── devtools/     # DevTools 面板
```

## 架构说明

### 与 Monorepo 的集成

扩展作为 Nx monorepo 中的一个 `application` 项目，通过以下方式与共享库集成：

- **@libs/api-client + @libs/api-core**: Axios + React Query 工厂模式调用后端 API
- **@libs/auth/client/web**: Better Auth 客户端，提供 `useSession`, `useActiveOrganization` 等 hooks
- **@libs/i18n**: i18next 国际化，支持中英文
- **@libs/billing**: 账单工具函数（`getActivePlan` 等）
- **@libs/analytics**: 扩展分析适配器（`extension-adapter`，基于 PostHog）
- **@libs/monitoring**: 扩展监控适配器（`extension-adapter`，基于 PostHog/Sentry）
- **@libs/ui-shared/web**: Shadcn UI 组件库
- **@libs/common**: 共享常量（`Platform.EXTENSION`）、工具函数、logger

### API 层架构差异

与 Web 应用使用 Vite proxy 不同，扩展直接请求完整的后端 URL：

```
Web:      fetch('/api/billing/me')  → Vite proxy → http://localhost:8000
Extension: fetch('http://localhost:3000/api/billing/me') → 直接请求
```

请求头中携带 `x-client-platform: extension` 用于后端区分客户端平台。

### 消息传递

扩展使用 `@webext-core/messaging` 进行跨上下文通信：

- **background ↔ popup/sidepanel/options**: 通过 `sendMessage` / `onMessage`
- **background ↔ content script**: 通过同样的 messaging API

## 生产打包

### Chrome 扩展

```bash
# 打包为 .zip 文件
pnpm build:extension:chrome
# 等价于
nx run extension:build-chrome
```

产物位于 `apps/extension/build/chrome-mv3-prod.zip`。

### Firefox 扩展

```bash
pnpm build:extension:firefox
# 等价于
nx run extension:build-firefox
```

产物位于 `apps/extension/build/firefox-mv3-prod.zip`。

### 类型检查

```bash
nx run extension:typecheck
```

## 发布流程

### Chrome Web Store

1. **注册开发者账号**
   - 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   - 需要 Google 账号，首次注册需支付一次性 $5 注册费

2. **准备发布素材**
   - 扩展图标：128×128 PNG（放置于 `src/assets/icon.png`，`@wxt-dev/auto-icons` 会自动生成其他尺寸）
   - 商店截图：至少 1 张，推荐 1280×800 或 640×400
   - 描述文案：简短描述（132 字符）+ 详细描述

3. **上传与提交**
   - 运行 `pnpm build:extension:chrome` 生成 `.zip`
   - 在 Developer Dashboard 中上传 `.zip` 文件
   - 填写商店信息、截图、分类
   - 提交审核（通常 1-3 个工作日）

4. **自动化发布（可选）**
   - 使用 [Chrome Webstore Upload](https://www.npmjs.com/package/chrome-webstore-upload-cli) CLI
   - 配置 CI/CD pipeline 自动上传

### Firefox Add-ons

1. **注册开发者账号**
   - 访问 [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
   - 使用 Mozilla 账号，免费

2. **上传与提交**
   - 运行 `pnpm build:extension:firefox` 生成 `.zip`
   - 在 Add-on Developer Hub 中提交 `.zip`
   - Firefox 审核通常较快（1-2 个工作日）

### 版本管理

更新 `apps/extension/package.json` 中的 `version` 字段，WXT 会自动同步到 `manifest.json`。

## 常见问题

### HMR 不工作

- 确保开发服务器正在运行（`pnpm dev:extension`）
- 检查 Chrome 控制台是否有 WebSocket 连接错误
- 尝试在 `chrome://extensions/` 中刷新扩展

### 权限相关错误

- 修改 `wxt.config.ts` 中的 `manifest.permissions` 后，需要在 `chrome://extensions/` 移除扩展并重新加载
- 某些权限（如 `<all_urls>`）可能需要用户手动授权

### CORS 错误

- 扩展的 background service worker 不受 CORS 限制
- 从 content script 发起的请求受 CORS 限制，应通过 messaging 委托给 background 处理
- 确保 `host_permissions` 中包含目标域名

### Content Script 样式隔离

- 使用 `createShadowRootUi` 创建 Shadow DOM 来隔离样式
- CSS 需要通过 `cssInjectionMode: 'ui'` 注入到 Shadow DOM 中

### TypeScript 路径解析

- 扩展的 `tsconfig.json` 显式列出了所有使用到的 `@libs/*` 路径
- 如果新增了 `@libs` 依赖，需要同步更新 `tsconfig.json` 的 `paths`
- WXT 通过 `@nx/vite` 的 `nxViteTsPaths` 插件在 Vite 构建时解析这些路径

### 依赖安装失败

- WXT 需要本地 `node_modules`，因此 `apps/extension` 被注册为 pnpm workspace 包
- 如果 `wxt prepare` 失败，尝试删除 `apps/extension/node_modules` 和 `.wxt/` 后重新安装
- 共享依赖（react, react-dom, @tanstack/react-query 等）从根 `node_modules` 解析

### 新增入口点

WXT 使用基于文件的入口点发现机制。在 `src/app/` 目录下创建新的目录和文件即可：

- **带 HTML 的页面**（popup, options 等）：创建 `index.html` + `main.tsx`
- **Background script**：创建 `index.ts`，使用 `defineBackground`
- **Content script**：创建 `index.tsx`，使用 `defineContentScript`

详见 [WXT Entrypoints 文档](https://wxt.dev/guide/directory-structure/entrypoints/)。
