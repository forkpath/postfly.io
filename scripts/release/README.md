# Kong 服务部署

Ray 的服务入口是 Kong：`/api` 代理 Engine，`/ws` 代理 Pulse，页面请求代理 Web。Worker 通过 RabbitMQ 消费任务，只在内网提供就绪检查。

| 文件 | 用途 | 何时使用 |
| --- | --- | --- |
| `deploy.sh` | 拉取固定 digest 镜像、启动基础设施、执行 Prisma 迁移、等待应用与 Kong 就绪 | GitHub 部署 workflow 或服务器发布 |
| `migrator-entrypoint.sh` | 在独立容器执行 `prisma migrate deploy` | 首次建库和后续业务 schema 发布 |
| `smoke-test.mjs` | 使用专用账号验证认证与 HTTP 业务 | 部署后的业务验收；按需运行 |
| `pulse-smoke-test.mjs` | 验证会话、WebSocket 连接及组织订阅 | 实时服务验收；按需运行 |

新数据库只应用当前初始化迁移，不要求历史版本、回填、发布颜色或已有测试账号。演示账号与业务探针不是启动前置条件。

`.github/workflows/deploy.yml` 构建镜像并调用 `deploy.sh`。服务器需 Docker 和 `.env`，环境变量说明、首次部署及更新流程见 [部署指南](../../docs/architecture/deployment.md)。本地开发使用 `pnpm docker:dev`、`pnpm db:init` 和 `dev:*`，无需构建镜像。

更新应用前先执行迁移；迁移失败时不替换应用容器。部署不会自动撤销数据库变更，项目产生真实业务数据后应维护自己的迁移和备份策略。

业务探针统一使用 `SMOKE_BASE_URL`（默认 `http://localhost:8080`）、`SMOKE_EMAIL`、`SMOKE_PASSWORD`；组织场景另配 `SMOKE_ORGANIZATION_ID`。Pulse 会从网关地址推导 `/ws`，HTTPS 对应 WSS。使用专用测试账号运行 `node scripts/release/smoke-test.mjs` 或 `node scripts/release/pulse-smoke-test.mjs`。
