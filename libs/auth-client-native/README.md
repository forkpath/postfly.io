# auth-client-native

## 用途

Better Auth Expo/React Native 客户端工厂，加入 Expo storage/深链、组织、OTP、2FA 等插件。

## Tags、使用者与场景

`type:data-access` · `runtime:native` · `domain:auth`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

Mobile/Native features；由宿主传 mobile 与 lastLoginMethod 配置、storage、scheme/baseURL。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

不自行读 .env；从 createClient 参数取得 baseURL、scheme 和持久化实现。Mobile 在 src/lib/env.ts 静态读取 EXPO_PUBLIC_API_BASE_URL；OAuth 的 secret 始终在服务端。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project auth-client-native --json
pnpm nx run auth-client-native:lint
pnpm nx run auth-client-native:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run auth-client-native:test --run
```

当前测试 permission-result；补 token/storage mock、参数、失败拒绝测试。安全存储和深链必须在开发构建 E2E 验证。

现有用例示例：[src/lib/auth-client-native.spec.ts](src/lib/auth-client-native.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
