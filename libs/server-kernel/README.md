# server-kernel

## 用途

ServerRuntimeConfig 等接口和纯配置契约，隔离 Node adapter 对通用配置类型的依赖。server 前缀不等于 node runtime，此库实际为 universal。

## Tags、使用者与场景

`type:contract` · `runtime:universal` · `domain:platform`。

Nest/Redis/RabbitMQ/可选适配器及其他需要共享配置类型的库；接口不负责建立连接。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

不读取 env、不加载 .env。ServerConfig/RedisConfig 等值由宿主组装注入；env 到字段的映射见 server-nest 和具体 adapter。

读取/配置定义：[src/lib/runtime-config.ts](src/lib/runtime-config.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project server-kernel --json
pnpm nx run server-kernel:lint
pnpm nx run server-kernel:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run server-kernel:test --run
```

现有测试针对配置契约；新增运行时校验时覆盖非法值/默认值/兼容配置，不引入真实 SDK。

现有用例示例：[src/lib/runtime-config.spec.ts](src/lib/runtime-config.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。
