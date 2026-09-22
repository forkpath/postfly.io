# server-email

## 用途

Nest EmailModule/EmailService 注入桥，桥接 email-server 的模板/原始邮件发送；不是第二套模板库。

## Tags、使用者与场景

`type:platform` · `runtime:node` · `domain:platform`。

需要 Nest DI 的 Node 模块；非 Nest 调用方可直接使用 email-server。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

自身不加载或直接读取 env。实际发送读取 email-server 的 EMAIL_FROM/RESEND_API_KEY；若注入 mock sender 可不提供云凭据。

依赖配置：[email-server](../../libs/email-server/README.md)。只在实际启用对应路径时提供厂商配置，不把服务端密钥放到客户端。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project server-email --json
pnpm nx run server-email:lint
pnpm nx run server-email:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run server-email:test --run
```

mock sender 验证 DI、模板/原始正文转发与失败传播；发送成功的 mock 不代表投递到邮箱。

现有用例示例：[src/email.spec.ts](src/email.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。
