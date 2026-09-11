# server-sms

## 用途

可选阿里云 SMS 适配，注册后可由 SmsService.send 发送模板短信。

## Tags、使用者与场景

`type:platform` · `runtime:node` · `domain:platform`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

需要短信的 Node Nest 业务模块；收件人/模板/权限/频率由业务决定，不在导入时发送。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

通过 ConfigService.sms 注入，宿主映射 env；启用时空配置报错，云端非 OK 响应抛错。

| 变量                                                            | 含义                       | 何时配置/默认          | 值从哪里来                                    |
| --------------------------------------------------------------- | -------------------------- | ---------------------- | --------------------------------------------- |
| `SMS_ACCESS_KEY_ID` / `SMS_ACCESS_KEY_SECRET` / `SMS_SIGN_NAME` | 阿里云短信账号和已审核签名 | 显式启用短信模块时必填 | 阿里云 RAM/短信控制台；模板编码作为 send 参数 |

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project server-sms --json
pnpm nx run server-sms:lint
pnpm nx run server-sms:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run server-sms:test --run
```

mock 阿里云 SDK，验证签名、模板参数、拒绝响应；真实投递需要批准的测试号码，避免自动重试导致重复短信。

现有用例示例：[src/sms.spec.ts](src/sms.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。

## 接入细节与厂商契约

可选阿里云短信 adapter，公共入口 `@libs/server-sms`。仅导入不会发送短信；注册后读取配置，只有调用 send 才请求云端。

## 接入

```ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { SmsModule } from '@libs/server-sms'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        () => ({
          sms: {
            accessKeyId: process.env['SMS_ACCESS_KEY_ID'],
            accessKeySecret: process.env['SMS_ACCESS_KEY_SECRET'],
            signName: process.env['SMS_SIGN_NAME']
          }
        })
      ]
    }),
    SmsModule.register()
  ]
})
export class NotificationModule {}
```

业务 provider 注入 `SmsService`，调用 `send(phoneNumbers, templateCode, JSON.stringify(variables))`。由业务决定收件人、云端已审核模板和频率限制。空配置在启用时明确报错；返回码不是 OK 时抛错，不把请求完成当作投递成功。不要自动重试验证码发送而造成重复短信。

测试通过 mock SDK 验证 Nest DI、签名/模板参数与云端拒绝。

`pnpm nx run-many -t lint,typecheck,test -p server-sms`
