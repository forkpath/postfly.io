# Ray · 跨端 SaaS 开发脚手架

Ray 是基于 Nx 的 monorepo。Web、Electron、Expo 和浏览器扩展共用契约与适配库；Kong 统一承接 HTTP 与 WebSocket 流量，Engine 处理 API，Pulse 处理实时连接，Worker 在内网消费 RabbitMQ 任务。

## 开始使用

需要 Node 24、pnpm 10.25 和 Docker。先复制 `.env.example` 为 `.env`，设置自己的数据库密码与 `BETTER_AUTH_SECRET`；已有 `.env` 不要覆盖。

```sh
pnpm install --frozen-lockfile
pnpm docker:dev
pnpm db:init
```

`db:init` 生成 Prisma Client，并通过一份初始化迁移创建完整数据库结构。无需执行回填、切换开关或框架研发过程中的升级步骤。它不会创建演示账号，普通用户通过认证页面注册；`db:seed` 仅在显式配置 SEED_EMAIL/SEED_PASSWORD 后创建开发演示账号和组织。

分别在终端启动服务：

```sh
pnpm dev:engine
pnpm dev:pulse
pnpm dev:worker
pnpm dev:web
```

访问 **http://localhost:8080**。开发环境的 Kong 将 `/api` 转到 Engine、`/ws` 转到 Pulse、其余页面转到 Web。Worker 的健康端口仅供内部检查，业务任务来自 RabbitMQ。

邮件验证、OAuth、支付等能力需要配置对应提供商；这些配置与数据库初始化无关。移动设备访问时，将公开 URL 的 localhost 改为开发机可访问的地址。

## 仓库结构

| 路径 | 职责 |
| --- | --- |
| [apps](apps/README.md) | Web、Desktop、Mobile、Extension 与浏览器 E2E |
| [services](services/README.md) | Engine、Pulse、Worker |
| [libs](libs/README.md) | 共享契约、领域实现、运行时适配器与 UI |
| [docker](docker/README.md) | 开发基础设施、Kong 路由、服务镜像与部署编排 |
| [scripts](scripts/README.md) | 清理、认证模型检查、CI 与发布入口 |
| [tools](tools/README.md) | 两个固定依赖的独立执行包 |
| [.agents/skills](.agents/skills) | Codex/Cursor 共用开发规范 |

## 开发入口

- [框架与依赖边界](docs/architecture/ray-framework-nx-guide.md)
- [环境变量](docs/development/environment.md)
- [数据库模型与日常命令](libs/pg-dao/README.md)
- [认证与授权](docs/architecture/authentication-and-authorized.md)
- [组织上下文](docs/architecture/workspace-switching.md)
- [测试](docs/development/testing.md)
- [Kong 与容器部署](docs/architecture/deployment.md)
- [使用开发 Agent](docs/development/agents.md)

## 常用命令

```sh
pnpm nx show projects
pnpm nx show project engine --json
pnpm nx graph
pnpm ci:affected
pnpm clean:dry-run
```

任务通过 Nx 执行，依赖与环境变化计入缓存。数据库写入、发布和外部副作用不缓存。应用通过各库公开入口导入代码，Web/Native 不导入 Node 运行时实现。详细规则见框架指南与 AGENTS.md。
