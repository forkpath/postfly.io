# i18n

## 用途

语言类型、翻译资源、React i18next 客户端和语言匹配工具。资源在 src/translations，不是 translationns。

## Tags、使用者与场景

`type:util` · `runtime:universal` · `domain:shared`。

Web/Native/服务端翻译相关调用方；Nest 文件加载适配在 server-nest。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

src/env.ts 读取宿主 DEFAULT_LOCALE（服务端）和 VITE_DEFAULT_LOCALE（公开客户端，默认 en），先 process.env，后 import.meta.env；值由产品语言策略决定。没有独立 .env。Mobile 自身 EXPO_PUBLIC_DEFAULT_LOCALE 不会自动变成本库变量，需在宿主初始化时传入语言。

读取/配置定义：[src/config.ts](src/config.ts)、[src/env.ts](src/env.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project i18n --json
pnpm nx run i18n:lint
pnpm nx run i18n:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

当前没有标准 `i18n:test` target，不能执行不存在的命令或用 lint/build 成功冒充单测。接入步骤见[测试开发指南](../../docs/development/testing.md#没有-test-target-怎么办)。

补语言回退、资源 key 缺失、插值、复数和客户端 provider 的测试；文件路径和服务端加载另做集成检查。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。
