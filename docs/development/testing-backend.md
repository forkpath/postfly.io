# 后端框架集成与 E2E 测试

使用 Node、pnpm 的仓库锁定版本，以及可运行 Linux 容器的 Docker / Compose v2。入口面向 Linux 和 macOS，不需要开发 `.env`、生产账号、邮件或监控服务凭据。

```sh
pnpm nx run engine:test-integration
pnpm nx run engine:e2e
pnpm nx run pulse:test-integration
pnpm nx run pulse:e2e
pnpm nx run worker:test-integration
pnpm nx run worker:e2e
```

常规单测继续使用 `<project>:test`；新增测试的类型检查使用 `<project>:typecheck-tests`。真实服务套件禁用 Nx 结果缓存。资源有限的开发机优先串行执行 E2E；CI 可以在独立 runner 上并行。

## 生命周期和数据边界

公共 target 调用 `scripts/testing/run-backend.mjs`。每次运行生成独立 Compose project、数据库、RabbitMQ vhost 和临时凭据。容器端口仅绑定 `127.0.0.1`，由 Docker 分配空闲端口，不使用开发卷。

runner 只继承系统与工具环境，显式关闭 Nx/Vite/Nest 的环境文件加载。确认 Docker 返回本机端口后，构造数据库连接并通过 `pg-dao:init` 应用仓库迁移。不能传入外部数据库 URL；内部 `integration-run` / `e2e-run` target 也会检查运行标识与数据库命名，不能直接对开发库运行。

单模块集成测试只启动所需依赖。Engine 的完整应用测试启动 PG、Redis、Mongo、RabbitMQ；Worker 的完整应用测试保留 Mongo 和 RabbitMQ。不会通过删除可选框架集成或把数据库替换成内存实现来获得通过结果。

Engine E2E 在自己的环境中显式启用组织计费，只验证已有身份的只读摘要路径，
不调用 Stripe 或创建支付。生产默认仍关闭该可选能力。Web 的历史组织计费场景
另需配置 `E2E_ORGANIZATION_BILLING_ENABLED=true`，并在隔离服务启用对应能力。

测试、启动失败或正常中断后均收集日志并删除该次容器、网络和卷。runner 设置启动与执行截止时间，清理失败也返回失败。操作系统强制杀死 runner（例如 `SIGKILL` 或机器断电）无法执行 `finally`；可根据报告中的唯一 `namespace` 定位遗留资源，仅清理该命名空间，不能清空整台机器的 Docker 数据。

## 如何增加自己的用例

- 在对应服务的 `tests/` 下增加 `*.integration.spec.ts` 或 `*.e2e.spec.ts`。单测仍放在 `src/`；套件使用不同收集规则，避免真实依赖测试混入快速单测。
- 数据用随机 ID 与 `.invalid` 邮箱。复用 `@libs/testing-server` 创建真实账号、组织；Engine 用真实 HTTP 登录拿到签名 cookie，Pulse 使用真实 Better Auth handler 创建持久化会话。业务 E2E 应增加自己的资源准备和归属断言。
- Engine 复用 `createEngineApplication()`，它与正式启动共享 AppModule、前缀、认证、请求解析、校验和错误映射。测试绑定随机本机端口，`afterAll` 关闭应用。
- Pulse 使用真实 `ws` 客户端。等待消息与关闭有明确截止时间；跨实例用例启动两个应用、经过 Redis 网络，不能把 publish 函数调用计数作为分发证明。
- Worker 用真实 RabbitMQ 投递，检查持久化 Inbox 和队列。可以只在测试装配中注册可控 handler。`worker-process.ts` 是测试专用子进程入口，用于实际崩溃恢复；它不进入服务正式构建。
- 新增测试必须断言公开行为和失败情况；缺少依赖、零用例、断言失败都应返回非零，不使用 `passWithNoTests` 或静默跳过掩盖问题。

最小示例可参考 Engine 的身份约束和 HTTP 测试、Pulse 的组织授权与双实例分发、Worker 的并发认领与 broker 重试。它们使用框架已有身份、组织、platform smoke event，不创建虚构业务模型。

## 当前消息契约

Pulse 校验消息结构、以真实 session 身份检查组织成员关系，并在投递前检查会话与成员是否仍有效。客户端不能决定事件 actor。Drain 拒绝新连接并关闭已有连接，恢复流量后可以重新连接。

Worker 的 Inbox 以 consumer/message ID 去重。仍有租约的重投消息会先向 broker 确认一个延迟副本，再确认当前投递；已完成的重复消息直接忽略。认领次数同时作为完成/失败写入的条件，旧处理者不能覆盖新租约的状态。

默认租约为五分钟，消息语义仍是“至少一次”。Handler 必须对外部副作用使用业务幂等键；长任务需要明确拆分或扩展续租策略。Inbox 记录去重不等于支付、邮件等外部操作恰好执行一次。崩溃测试只调整测试记录的租约时间，真实进程和 RabbitMQ 时钟照常运行。

## 报告与验收

每次运行的结果位于：

```text
dist/test-results/<project>/<integration|e2e>/<run-id>/
  junit.xml
  runner.log
  infrastructure.log
  run.json
  process-<pid>.log       # Worker 进程恢复测试
```

`run.json` 分别记录测试是否通过、资源是否清理、中断状态及命名空间。CI 应始终上传整个报告目录，包括失败时的日志。断言通过但清理失败不是成功；本地通过也不能替代 Linux CI 记录。实际执行结果和仍未完成的验证见 [阶段验收记录](testing-framework-validation.md)。
