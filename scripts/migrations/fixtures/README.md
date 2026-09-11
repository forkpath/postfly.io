# pre-expand-data.sql · 历史升级夹具

这是迁移集成测试数据，不是生产 seed。无独立 Nx tags；语义 type:platform/runtime:node/domain:platform（由 Node/shell 测试驱动 PG）。

verify-historical-upgrade.sh 在空测试库应用历史 schema 后加载 pre-expand-data.sql，创建 history-\* 用户/组织/计费与重复权限，用于验证清理、冲突拒绝和回填。通过 pnpm nx run pg-dao:historical-migration-test 运行；不要对当前开发或生产库单独导入。

唯一环境来源是父流程的 POSTGRES_DATABASE_URL/psql 容器配置。无独立单元测试或 E2E，断言在父脚本及 tools/migration-tests。改夹具同步对应 ID/行数断言，包含正常、完全重复、权限冲突和无法匹配 owner 的案例。
