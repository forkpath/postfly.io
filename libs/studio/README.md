# studio

## 用途

Web/桌面 renderer 共享页面模块：认证、用户设置、组织、admin 与 CRM 布局；不是原子 UI 库，也不是独立 app。

## Tags、使用者与场景

`type:feature` · `runtime:web` · `domain:composition`。

apps/web 和 apps/desktop renderer 的路由组合层；不要让 native 依赖 DOM 页面。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

src/env.ts 使用宿主 process.env，src/config/app.ts 另读 import.meta.env，auth/client.ts 用 VITE_API_ENDPOINT；未统一的读取路径不能简单视作同一来源。本库没有独立 env 文件。

| 变量                                                                                        | 含义                              | 何时配置/默认                                                    | 值从哪里来                           |
| ------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| `VITE_URL`                                                                                  | 站点对外 URL                      | Web 使用当前 origin；SSR/file 使用 VITE_URL，缺省 localhost:3000 | 站点部署域名                         |
| `VITE_API_ENDPOINT`                                                                         | Studio Better Auth 客户端 baseURL | 可选；同源时可留空                                               | Engine 对外认证地址                  |
| `VITE_DEFAULT_LOCALE` / `VITE_THEME_MODE` / `VITE_THEME_COLOR`                              | 初始语言、主题模式、主题色        | 默认 en/system/orange（具体可用值见 ui-core）                    | 产品设计配置                         |
| `VITE_AUTH_PASSWORD` / `VITE_AUTH_MAGIC_LINK` / `VITE_AUTH_PASSKEY` / `VITE_AUTH_ANONYMOUS` | 认证 UI 功能开关                  | 默认 true/false/true/true                                        | 应与服务端能力一致；不是安全权限开关 |
| `CONTACT_EMAIL`                                                                             | 联系邮箱                          | 若使用 Studio env 模块，其 server schema 必填合法 email          | 公开业务联系地址                     |
| `NODE_ENV`                                                                                  | 运行模式                          | 默认 development                                                 | 构建/启动命令                        |

依赖配置：[api-client](../../libs/api-client/README.md)、[auth-client-web](../../libs/auth-client-web/README.md)、[billing-contract](../../libs/billing-contract/README.md)、[analytics-web](../../libs/analytics-web/README.md)、[monitoring-web](../../libs/monitoring-web/README.md)、[i18n](../../libs/i18n/README.md)。只在实际启用对应路径时提供厂商配置，不把服务端密钥放到客户端。

读取/配置定义：[src/env.ts](src/env.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project studio --json
pnpm nx run studio:lint
pnpm nx run studio:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run studio:test --run
```

目前 admin API/export/nav 测试只覆盖部分行为；新页面用 jsdom 测权限导航/表单/失败反馈，API 用替身；用户完整流程走 web-e2e。

现有用例示例：[src/modules/admin/**tests**/api.spec.ts](src/modules/admin/__tests__/api.spec.ts)、[src/modules/admin/**tests**/exports.spec.ts](src/modules/admin/__tests__/exports.spec.ts)、[src/modules/admin/**tests**/nav-config.spec.ts](src/modules/admin/__tests__/nav-config.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。
