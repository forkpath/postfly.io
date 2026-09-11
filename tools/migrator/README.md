# migrator · 固定版本数据库迁移运行包

## 用途与分类

Nx 项目 @ray/migrator；type:platform、runtime:node、domain:platform。仅供发布/迁移维护者。它隔离固定 Prisma CLI 7.8.0 与 dotenv 17.3.1；不是 Engine runtime 的一部分，也不是业务 import 库。

## 环境与运行

docker/migrator.Dockerfile 将本包、Prisma schema、migrations、策略文件与入口脚本一起装进不可变镜像。包没有单独 Nx build/test target。

构建镜像（会拉取基础镜像和安装依赖，不迁移 DB）：

```sh
docker build -f docker/migrator.Dockerfile -t ray-migrator:local .
```

运行由 [发布控制器](../../scripts/release/README.md)负责，不应在开发者不明确目标时直接复制生产运行命令。容器入口 scripts/release/migrator-entrypoint.sh 要求 POSTGRES_DATABASE_URL（管理员提供的目标库连接串）和 RELEASE_MIGRATION_CLASS（none/expand，由受控 release intent 得出）。值通过部署环境传入，不包含在镜像内。

入口先校验待执行 migration 与 policy，再执行固定包内 Prisma deploy；expand 另执行非事务并发索引 SQL，最后验证 migration/索引状态。**真实写库，不可缓存**。bootstrap/contract 不能混入蓝绿发布。

## 测试与扩展

```sh
bash scripts/release/test-migrator-entrypoint.sh
node --test scripts/release/migration-policy.test.mjs
```

以上用测试替身，不连接生产。新增入口步骤同时补执行顺序、失败中止、none/expand/禁止 contract 的断言；真正 SQL/在线索引需要隔离 PostgreSQL 演练。用 pnpm ci:container-contracts 检查 Docker 合同仍需 Docker/registry，不等于镜像已部署。
