# ui-core

## 用途

跨端主题 token、主题类型、样式工具以及历史保留的响应式 hooks；不应承载业务请求。

## Tags、使用者与场景

`type:ui` · `runtime:universal` · `domain:shared`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

ui-web/ui-native 和兼容消费者共享 token。部分 hooks 仍依赖浏览器能力，universal tag 不是所有导出都可在 Native/SSR 调用的证明。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

本项目不直接读取环境变量，也不自行加载 .env。配置由宿主通过参数/context 提供；若消费其他库，仍需遵守被调用库的配置契约。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project ui-core --json
pnpm nx run ui-core:lint
pnpm nx run ui-core:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

当前没有标准 `ui-core:test` target，不能执行不存在的命令或用 lint/build 成功冒充单测。接入步骤见[测试开发指南](../../docs/development/testing.md#没有-test-target-怎么办)。

补主题/颜色/token 纯函数测试；浏览器 hook 在 jsdom 模拟 matchMedia，Native 不直接调用 DOM hook。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
