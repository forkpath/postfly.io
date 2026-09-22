# billing-client-native

## 用途

RevenueCat Native Provider 与 customer/paywall hooks；用于移动订阅 SDK 接入，组织计费不走 RevenueCat。

## Tags、使用者与场景

`type:data-access` · `runtime:native` · `domain:billing`。

Mobile/Native UI；需具有 react-native-purchases 原生模块的开发/发布构建。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

src/lib/env.ts 从宿主 process.env 动态按 key 读取，没有自行加载文件。当前不是静态 Expo env 写法；缺 key 时 Provider 跳过 configure，不能用构建成功证明初始化成功。

| 变量                                                                             | 含义                     | 何时配置/默认                                  | 值从哪里来                         |
| -------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------- | ---------------------------------- |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`  | iOS/Android 公开 SDK key | 相应平台购买功能需要；缺少则跳过 SDK configure | RevenueCat 对应平台 Public SDK key |
| `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` / `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY` | 以上变量未设时的兼容别名 | 仅兼容                                         | 旧移动配置；不是服务端 REST key    |

依赖配置：[billing-contract](../../libs/billing-contract/README.md)。只在实际启用对应路径时提供厂商配置，不把服务端密钥放到客户端。

读取/配置定义：[src/lib/env.ts](src/lib/env.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project billing-client-native --json
pnpm nx run billing-client-native:lint
pnpm nx run billing-client-native:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run billing-client-native:test --run
```

当前契约测试较窄；需 mock Purchases/Platform，补缺 key、不同行为、恢复购买、失败和用户切换；购买链路必须用商店 sandbox。

现有用例示例：[src/lib/billing-client-native.spec.ts](src/lib/billing-client-native.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。
