# 环境配置：谁加载、何时生效

所有命令默认从仓库根运行。.env.example 是配置示例，不是可直接部署的生产值。真实凭据放未跟踪文件或 secret manager，不写入文档/日志。

## 加载链

| 场景                                 | 实际来源                                                                                                                   |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 根 pnpm bootstrap / dev / run doctor | Node 内置解析器读取根 .env，仅展开文件内变量；不继承 shell 数据库配置，拒绝外部数据库自动初始化                            |
| 根 pnpm dev:\*                       | dotenv-cli -e .env 先注入根配置，再启动 Nx                                                                                 |
| 直接 pnpm nx run                     | 继承调用者环境，并受 Nx env 文件加载规则影响；需要确定的环境时用下方显式 wrapper                                           |
| Web / Desktop renderer               | Vite envDir 指向根，公开 `VITE_*` 通常在打包时注入；SSR 启动进程仍需自己的环境                                             |
| Extension                            | wxt.config.ts 按 mode 加载根 env，客户端配置在构建时处理                                                                   |
| Expo                                 | 根 dev wrapper 先注入，Expo 自身也可加载应用目录 env；静态 `EXPO_PUBLIC_*` 引用写进 bundle。EAS 远程构建需单独配置对应环境 |
| Nest                                 | 进程环境 + ConfigModule.forRoot；部分库在 import 时校验，所以启动前就要注入                                                |
| Prisma                               | libs/pg-dao/prisma.config.ts 导入 dotenv，工作目录影响默认文件查找，建议显式 wrapper                                       |
| 容器                                 | Compose environment/env_file 和部署 secrets；重启时改变量不能重写已编译的客户端值                                          |
| 普通库                               | 不拥有独立 .env；读宿主环境或通过参数/DI 注入，见各库 README                                                               |
| 脚本                                 | 一般只读进程 env；部署脚本通过 Compose 的 --env-file 加载 RAY_ENV_FILE（默认 DEPLOY_PATH/.env）                            |

```sh
# .env.local-test 需自行建立，保持未跟踪，只含测试环境值
pnpm exec dotenv -e .env.local-test -- pnpm nx run engine:serve
```

不要通过注入整个 process.env 到客户端来修复缺变量。`VITE_*` / `EXPO_PUBLIC_*` 可被用户读取，只放地址、公开 SDK key、DSN、产品 ID、UI 开关；DB URL、OAuth/支付 secret、签名凭据留在 Node/CI。

本地开发统一访问 Kong，默认地址为 `http://localhost:8080`；bootstrap 遇到端口占用或使用 `--isolated` 时会分配空闲端口，以完成信息和 `.env` 的 `PUBLIC_ORIGIN` 为准。`PUBLIC_ORIGIN`、`VITE_URL`、`VITE_API_BASE_URL` 与 `BETTER_AUTH_URL` 应与公开入口一致；服务自身端口用于网关转发。

## 配置值来源

- 地址/端口：部署拓扑决定，真机 localhost 指手机自身；手机要使用可达的开发机地址。
- DB/Redis/Mongo/RabbitMQ：基础设施管理员或本地 Compose 配置，密码来自 secret manager；示例密码不能投产。
- OAuth：Google/GitHub/Apple 应用后台登记 callback 后取得 ID/secret。
- Stripe：测试 Dashboard API key、Price ID；Webhook secret 属于具体 endpoint，不是 API key。
- RevenueCat：移动公开 SDK key 与服务端 REST key、Webhook Authorization secret 各不相同。
- PostHog/GA/Sentry：项目后台提供 key、host、measurement ID、DSN；GA secret 仅 Node，DSN 不是上传/管理 token。
- 邮件/短信/存储/搜索：厂商后台或最小权限账号提供；域名/签名/模板/bucket/index 事先配置。
- 功能选项：例如 ORGANIZATION_BILLING_ENABLED 仅在业务启用组织计费时开启，与数据库初始化无关。

各 README 列出自身配置和必要的依赖配置链接。新增 env 同步文档与缓存输入；schema 校验仍由代码负责。不要假定 .env.example 已列出每个可选功能变量。

## 已知限制

billing Native 和部分共享库仍使用动态 process.env[key]，不能认为已经通过全仓库 Expo 内联验证；Node mock 测试也不证明真机配置正确，见 [边界说明](boundary-checks.md)。

POSGTRES_DATABASE_URL 是兼容拼写，仅在新变量缺失时回退；新配置使用 POSTGRES_DATABASE_URL。当前读取库只在非 production 打印废弃告警。
