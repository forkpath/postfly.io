# Auth 脚本 · check-auth-schema.mjs

## 用途与分类

唯一执行脚本 check-auth-schema.mjs，由 auth-server:schema-check target 调用。脚本本身无独立 tags，语义 type:platform/runtime:node/domain:auth；供认证维护者与 CI，不由业务代码导入。

## 运行、环境与输出

```sh
pnpm nx run auth-server:schema-check
```

需要已安装 workspace 依赖及 tools/auth-schema。脚本将 Node/路径解析、认证、邮件、OAuth env 覆盖为测试值；PG URL 使用已有 POSTGRES_DATABASE_URL/旧别名或本地占位 URL。无需云端生产凭据，不应携带生产环境执行。

候选生成于系统临时目录，比较后 finally 清理。零退出表示当前归一化逻辑相同，非零表示 CLI 失败/漂移。忽略物理 map/schema，保留的 billing relation/索引白名单定义在脚本中；不能证明物理 schema 无漂移。

CLI 固定 1.4.21，与 runtime 1.6.26 不同。生成配置来自 auth-server/src/lib/auth-server.ts，受控文件为 pg-dao/src/models/auth.prisma；不覆盖仓库 schema。旧 auth:generate-auth-schema noop 随旧项目退役，维护者统一使用 auth-server:schema-check。

## 测试与后续维护

目前没有独立 comparer 单元测试文件。修改解析/白名单时新增 fixture 测试，覆盖 model/enum/field/default/index/扩展及失败退出；真实认证行为另走 auth-server 测试和 E2E。若改为可写 schema 维护任务，必须另设不可缓存目标与人工 migration 审核，不能借此检查静默覆写。
