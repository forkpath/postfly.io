# common

## 用途

跨端基础类型、品牌常量、枚举式常量、日期/字符串工具和公共 hooks。APP_NAME/APP_SLUG 是源码品牌常量，不是部署 env。

## Tags、使用者与场景

`type:util` · `runtime:universal` · `domain:shared`。

各 runtime 的 util/contract/UI/平台及应用，在需要不属于具体业务域的基础定义时使用。不能反向依赖业务库。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

本项目不直接读取环境变量，也不自行加载 .env。配置由宿主通过参数/context 提供；若消费其他库，仍需遵守被调用库的配置契约。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project common --json
pnpm nx run common:lint
pnpm nx run common:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

当前没有标准 `common:test` target，不能执行不存在的命令或用 lint/build 成功冒充单测。接入步骤见[测试开发指南](../../docs/development/testing.md#没有-test-target-怎么办)。

优先给 src/utils 的边界值、时区/空值、格式化和品牌契约补测试；hooks 按运行环境单独测试。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。
