# email-server

## 用途

Node 邮件模板渲染及投递，实现 sendEmail 和 sendRawEmail。默认选择 Resend，保留 SES/阿里云邮件实现。

## Tags、使用者与场景

`type:platform` · `runtime:node` · `domain:shared`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

auth-server 及 Node 业务逻辑；Nest 注入场景用 server-email。浏览器只能引用 email 契约。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

由宿主进程提供。公共入口导入不会立即检查发送凭据；首次发送才动态加载默认 Resend。providers 的导出决定厂商，不存在仅设置 EMAIL_PROVIDER 就自动切换的机制。

| 变量                                                                                 | 含义                           | 何时配置/默认          | 值从哪里来                                |
| ------------------------------------------------------------------------------------ | ------------------------------ | ---------------------- | ----------------------------------------- |
| `EMAIL_FROM`                                                                         | 发件人地址                     | 实际发送时必填         | 邮件服务已验证域名/发件人                 |
| `RESEND_API_KEY`                                                                     | 当前默认 Resend 发送凭据       | 实际发送时必填         | Resend 项目 API key                       |
| `AWS_SES_ACCESS_KEY_ID` / `AWS_SES_ACCESS_KEY_SECRET` / `AWS_SES_REGION`             | 保留的 SES 提供方凭据/区域     | 只有显式切换实现才使用 | AWS IAM 最小权限账号与 SES 区域           |
| `ALIYUN_DM_ACCESS_KEY_ID` / `ALIYUN_DM_ACCESS_KEY_SECRET` / `ALIYUN_DM_ACCOUNT_NAME` | 保留的阿里云邮件凭据与发信账号 | 只有显式切换实现才使用 | 阿里云 RAM 与邮件推送后台                 |
| `ALIYUN_DM_REPLY_TO_ADDRESS` / `ALIYUN_DM_ADDRESS_TYPE`                              | 阿里云回信/地址类型选项        | 该实现可选             | 按现有 provider env schema 与厂商配置传入 |

读取/配置定义：[src/env.ts](src/env.ts)、[src/utils/env.ts](src/utils/env.ts)、[src/providers/resend/env.ts](src/providers/resend/env.ts)、[src/providers/env.ts](src/providers/env.ts)、[src/providers/aliyun-dm/env.ts](src/providers/aliyun-dm/env.ts)、[src/providers/aws-ses/env.ts](src/providers/aws-ses/env.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project email-server --json
pnpm nx run email-server:lint
pnpm nx run email-server:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

### 可选厂商实现的验证边界

SES/阿里云模块保留，但不是本次已验证的生产 provider。当前 SES 源码仍存在单引号包裹带 `${env.AWS_SES_REGION}` 的 URL 字面量，切换前必须修复/验证真实 endpoint 与签名，不能只设置凭据就上线。ALIYUN_DM_REPLY_TO_ADDRESS 实际为字符串布尔开关（精确 true，缺省 true），不是回复邮箱；ALIYUN_DM_ADDRESS_TYPE 转为数字，缺省1。

## 单元测试：运行与编写

```sh
pnpm nx run email-server:test --run
```

mock 投递 provider，验证模板渲染、html/text/subject、原始正文发送与失败传播；真实邮件投递另用隔离账号测试。

现有用例示例：[src/runtime.spec.ts](src/runtime.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
