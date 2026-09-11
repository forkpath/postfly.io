# Release · 不可变部署与回退控制面

## 用途、分类与使用者

本目录不是 Nx 项目，语义 type:platform/runtime:node/domain:platform（包含 shell 控制器）。仅供发布 workflow/运维使用；所有部署/迁移/上传动作不可缓存。目录存在不表示生产已部署。

## 文件与运行方式

| 文件                           | 入口与作用                                                               | 副作用/验证范围                                                                            |
| ------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| deploy-blue-green.sh           | bash scripts/release/deploy-blue-green.sh deploy 或 rollback 或 finalize | 真实启动/停止容器、切 Kong、迁移、smoke、写 manifest；仅在完成初始 adoption 的主机执行     |
| migrator-entrypoint.sh         | migrator 镜像 ENTRYPOINT                                                 | 固定 Prisma deploy、expand SQL、前后门禁；不是可以在宿主随手执行的脚本，使用 /app 绝对路径 |
| migration-policy.mjs           | check-migration-policy 导入的策略逻辑库                                  | 解析迁移分类/允许路径，本身不是部署入口                                                    |
| check-migration-policy.mjs     | node scripts/release/check-migration-policy.mjs --mode=static            | 默认检查迁移目录、policy、release intent；blue-green 模式另连接目标 PG 检查 pending/索引   |
| smoke-test.mjs                 | node scripts/release/smoke-test.mjs                                      | 登录、Session、用户计费、组织列表及可选组织计费；会创建认证 Session，不是只读探针          |
| pulse-smoke-test.mjs           | node scripts/release/pulse-smoke-test.mjs                                | 先登录 Engine 再连 WebSocket；固定 ws://127.0.0.1:3001/ws，可订阅组织                      |
| migration-policy.test.mjs      | node --test scripts/release/migration-policy.test.mjs                    | 策略纯逻辑/fixture 测试，不迁移 DB                                                         |
| test-deploy-controller.sh      | bash scripts/release/test-deploy-controller.sh                           | 用 fixtures/bin 的 Docker/curl 替身验证控制器失败/回退/审计行为，不是生产演练              |
| test-migrator-entrypoint.sh    | bash scripts/release/test-migrator-entrypoint.sh                         | 用 fixtures/migrator-bin 验证入口顺序与失败中止，不是真实 SQL                              |
| [fixtures](fixtures/README.md) | 由上述测试设置局部 PATH 调用                                             | 假命令，不可复制到生产 PATH                                                                |

## 环境变量：谁配置、从哪里来

deploy-blue-green 在启动时读取 DEPLOY_PATH（默认 /opt/ray），source 该目录 .env；文件必须可信，因 source 会执行 shell 内容。以下由部署环境/secret manager/受控 release manifest 提供：

| 变量/文件                                                                                                         | 含义与来源                                                                 |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| ENGINE_IMAGE / WEB_IMAGE / PULSE_IMAGE / WORKER_IMAGE / MIGRATOR_IMAGE                                            | CI 构建并推送后取得的完整 image@sha256:digest，不能用可变 latest           |
| RELEASE_SHA / RELEASE_OPERATOR                                                                                    | 本次发布 Git SHA 和操作者身份，由 workflow/审计系统提供                    |
| BACKUP_CHECK_COMMAND                                                                                              | 运维提供的真实备份状态检查命令；失败停止发布，不可填 true                  |
| RELEASE_GUARD_COMMAND                                                                                             | 运维提供的错误率/P95/认证失败/DB连接/队列阈值命令；观察期执行，不可填 true |
| RELEASE_OBSERVATION_SECONDS / RELEASE_OBSERVATION_INTERVAL_SECONDS                                                | 观察时长/间隔，默认300/15秒，由发布策略定                                  |
| RELEASE_WEBSOCKET_DRAIN_SECONDS                                                                                   | drain 等待，默认15秒；不能仅凭等待证明所有连接已安全完成                   |
| ROLLBACK_RTO_TARGET_SECONDS                                                                                       | 回退耗时目标，默认300秒；超过目标即使切回也报告未达标                      |
| ROLLBACK_REASON                                                                                                   | 手工 rollback 必填事故原因，由操作人填写                                   |
| GHCR_TOKEN / GHCR_USER                                                                                            | 需要 registry 登录时的凭据，来自 GitHub/secret manager，不能写日志         |
| POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB                                                                   | 发布控制器构造容器网内 PG URL，来自基础设施配置                            |
| DOMAIN / ACME_EMAIL / REDIS_PASSWORD                                                                              | 网关模板域名/证书通知邮箱/Redis认证，来自部署配置                          |
| SMOKE_EMAIL / SMOKE_PASSWORD / SMOKE_ORGANIZATION_ID                                                              | 隔离/专用验收账号与组织；ID可选，生产 smoke 账号需最小权限                 |
| BILLING_OWNER_V2_DUAL_WRITE / BILLING_OWNER_V2_SHADOW_READ / BILLING_OWNER_V2_READ / ORGANIZATION_BILLING_ENABLED | 迁移负责人确认的运行阶段开关，依赖顺序需满足                               |
| .release/migration-class                                                                                          | 随发布的不可变意图 none/expand；蓝绿路径禁止 contract/bootstrap            |
| releases/active-color 和 color-\*-release                                                                         | 初次 adoption runbook 建立的部署状态，不可凭空创建来跳过验证               |

migrator 接收 POSTGRES_DATABASE_URL 与 RELEASE_MIGRATION_CLASS。check-migration-policy 支持 --migrations-dir、--policy、--release-intent；blue-green 模式需要 --expected-class 或 RELEASE_MIGRATION_CLASS 和 PG URL。static 不是数据库验证。

独立 HTTP smoke 使用 SMOKE_BASE_URL（默认 http://127.0.0.1:8000）；Pulse smoke 使用 ENGINE_SMOKE_BASE_URL，无自动 dotenv。两者读取测试账号，Pulse 的 Engine URL 不改变固定 WS 地址。

## 如何测试与新增场景

先跑纯测试/fixtures，不运行 deploy：

```sh
node --test scripts/release/migration-policy.test.mjs
bash scripts/release/test-migrator-entrypoint.sh
bash scripts/release/test-deploy-controller.sh
```

添加失败注入时保留原始状态快照、检查命令执行顺序、digest、flag、manifest、RTO 与失败退出码；fixture 测试不能宣称数据库已迁移或5分钟生产回退已实测。真实端到端需隔离主机、共享基础设施、候选/旧色、代理切流和受控负载。

采用流程见 [初始蓝绿 runbook](../../docs/migrations/blue-green-adoption-runbook.md)。finalize 停止非活动颜色，不执行 Contract 或删除数据库列；Contract 单独审核，见 [SQL 手册](../migrations/sql/README.md)。
