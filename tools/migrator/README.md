# Prisma 迁移运行包

`@ray/migrator` 仅提供固定版本的 Prisma CLI 与 dotenv。`docker/migrator.Dockerfile` 使用它构建一次性数据库迁移镜像，Engine 运行时无需携带 CLI。

镜像包含当前 Prisma 模型和受控迁移。发布脚本先启动 PostgreSQL，再运行这个容器执行 `prisma migrate deploy`，成功后启动应用。迁移失败会阻止应用更新。

本地开发使用 `pnpm db:init` 初始化空库；无需手工进入此目录。后续业务模型变化通过标准 Prisma 迁移交付，同一部署命令会应用尚未执行的迁移。已完成的迁移不会重复执行。

容器依赖 `POSTGRES_DATABASE_URL`，会实际写入数据库，禁止缓存。模型与命令见 [pg-dao](../../libs/pg-dao/README.md)，发布方式见 [部署指南](../../docs/architecture/deployment.md)。
