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

本地：`pnpm docker:dev` → `pnpm db:init` → 启动各 `dev:*`。
服务镜像产物：`pnpm nx run-many -t package -p engine,pulse,worker` 和 `pnpm build:web`。
部署流程见 [Kong 部署指南](../docs/architecture/deployment.md)。
