# node / pnpm / psql Migrator 替身

语义 type:platform/runtime:node/domain:platform；不是独立 Nx 项目。给 test-migrator-entrypoint.sh 使用。

node 模拟策略检查，pnpm 模拟 Prisma 命令，psql 模拟在线索引阶段；它们不会验证真实 schema/DDL。由父测试提供临时日志和失败开关，无生产环境变量。执行 bash scripts/release/test-migrator-entrypoint.sh 验证顺序/中止/none/expand 分支，新增命令时必须同时更新失败断言。严禁把此 PATH 导出到真实发布环境。
