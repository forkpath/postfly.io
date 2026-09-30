# 容器与网关

| 文件/目录                  | 用途                                                         |
| -------------------------- | ------------------------------------------------------------ |
| `docker-compose.dev.yml`   | 开发基础设施与 Kong，应用由本机 Nx 启动                      |
| `docker-compose.infra.yml` | 部署用 PostgreSQL、Redis、MongoDB、RabbitMQ、Kong            |
| `docker-compose.app.yml`   | 与 infra 合并，运行 Engine、Pulse、Worker、Web 与 Migrator   |
| `*.Dockerfile`             | 使用已构建产物创建服务镜像；Migrator 单独安装固定 Prisma CLI |
| `kong/kong.yml`            | `/api`、`/ws`、页面的公共路由与限流                          |
| `kong/tls-plugins.yml`     | 按需开启的 ACME 与 HTTPS 重定向插件                          |
| `kong/entrypoint.sh`       | 将环境变量渲染为 Kong 声明配置                               |
| `mongo/init-db.js`         | 空 MongoDB 数据卷首次启动时建立应用数据库用户                |

本地推荐：`pnpm bootstrap --seed --start`。也可分步执行 `pnpm docker:dev` → `pnpm db:init` → `pnpm dev`。
自动生成的 `.env` 用 `COMPOSE_PROJECT_NAME` 和 `RAY_DEV_NAMESPACE` 隔离每个副本的容器、网络和数据卷，并记录实际端口。
没有 namespace 变量的既有配置保留 `ray-*` 容器/卷名称；网络由 Docker 分配，不再固定子网。
Postgres、Redis、Mongo、RabbitMQ 的宿主机端口只绑定 loopback；Kong 仍可供局域网真机访问。
`docker:dev:down` 保留数据，勿用 `down -v` 代替普通停止。
本机 RabbitMQ 默认使用两个 Erlang scheduler，CLI 使用一个，避免与编译任务争抢
整个 Docker VM 的 CPU；可通过 `RABBITMQ_DEV_ERL_ARGS` 显式调整。此限制只用于开发。
健康探针每 30 秒执行一次真实 ping，允许 15 秒完成，避免首次并行编译期间误报不健康。
依据见 [RabbitMQ 运行时配置](https://www.rabbitmq.com/docs/runtime)。
开发网关默认允许每分钟 10000 次请求（`KONG_DEV_RATE_LIMIT_MINUTE`），满足 Vite
大量源码模块请求；部署入口继续默认每分钟 200 次。没有放宽 Engine 的业务限流。
服务镜像产物：`pnpm nx run-many -t package -p engine,pulse,worker` 和 `pnpm build:web`。
部署流程见 [Kong 部署指南](../docs/architecture/deployment.md)。
