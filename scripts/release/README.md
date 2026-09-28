# Kong 服务部署

Ray 的服务入口是 Kong：`/api` 代理 Engine，`/ws` 代理 Pulse，页面请求代理 Web。Worker 通过 RabbitMQ 消费任务，只在内网提供就绪检查。

| 文件 | 用途 | 何时使用 |
| --- | --- | --- |
| `deploy.sh` | 拉取固定 digest 镜像、启动基础设施、执行 Prisma 迁移、等待应用与 Kong 就绪 | GitHub 部署 workflow 或服务器发布 |
| `migrator-entrypoint.sh` | 在独立容器执行 `prisma migrate deploy` | 首次建库和后续业务 schema 发布 |
| `smoke-test.mjs` | 使用专用账号验证认证与 HTTP 业务 | 部署后的业务验收；按需运行 |
| `pulse-smoke-test.mjs` | 验证会话、WebSocket 连接及组织订阅 | 实时服务验收；按需运行 |
| `framework-smoke.mjs` | 验证页面、健康状态、匿名 HTTP/WS 授权边界 | 自动部署后执行，不需要业务账户 |
| `publish-verified-images.mjs` | 核对成功报告、提交号和镜像 ID，再推送已验证镜像 | 仅由发布 workflow 调用 |

新数据库只应用当前初始化迁移，不要求历史版本、回填、发布颜色或已有测试账号。演示账号与业务探针不是启动前置条件。

`.github/workflows/deploy.yml` 构建镜像并调用 `deploy.sh`。服务器需 Docker 和 `.env`，环境变量说明、首次部署及更新流程见 [部署指南](../../docs/architecture/deployment.md)。本地开发使用 `pnpm docker:dev`、`pnpm db:init` 和 `dev:*`，无需构建镜像。

更新应用前先执行迁移；迁移失败时不替换应用容器。部署不会自动撤销数据库变更，项目产生真实业务数据后应维护自己的迁移和备份策略。

发布前先调用完整 CI，并在一次性基础设施中实际启动待发布镜像；通过后才推送，
部署按 digest 引用。任何验证失败都会阻止后续步骤。部署后的公开入口探针失败
也会使 workflow 失败。详细范围和环境限制见 [测试与发布门禁](../../docs/development/testing-ci.md)。

CI 的 `release-image-verification` 附件保留启动日志、镜像 ID 和已推送 digest
清单 `published-images.json`。部署失败时可在服务器使用同一 Compose 文件执行
`ps` 和 `logs --tail 200 engine pulse worker web kong`。需要回退应用时，先确认
旧版本与当前 schema 兼容，再将 `ENGINE_IMAGE`、`PULSE_IMAGE`、`WORKER_IMAGE`、
`WEB_IMAGE` 设为前次清单的 digest 引用，使用 `docker compose --env-file .env
-f docker/docker-compose.infra.yml -f docker/docker-compose.app.yml up -d --wait
engine pulse worker web kong` 恢复应用。此操作不运行 migrator，不撤销数据库；
恢复后再次执行框架探针。不要在未审查 schema 兼容性的情况下自动回退。

业务探针统一使用 `SMOKE_BASE_URL`（默认 `http://localhost:8080`）、`SMOKE_EMAIL`、`SMOKE_PASSWORD`；组织场景另配 `SMOKE_ORGANIZATION_ID`。Pulse 会从网关地址推导 `/ws`，HTTPS 对应 WSS。使用专用测试账号运行 `node scripts/release/smoke-test.mjs` 或 `node scripts/release/pulse-smoke-test.mjs`。
