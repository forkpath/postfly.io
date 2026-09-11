# Online SQL · Expand 与 Contract

无独立 Nx tags；语义 type:platform/runtime:node/domain:platform（由维护进程调用，SQL 实际在 PG 执行）。供数据库迁移维护者，不是 app 可导入库，无业务单元测试 target。

## expand-concurrent-indexes.sql

对明确目标 POSTGRES_DATABASE_URL，由 psql -X -v ON_ERROR_STOP=1 -f scripts/migrations/sql/expand-concurrent-indexes.sql 调用。通常通过上级 README 中的已审 migration-test/history/migrator 流程运行，不手工跳过 Prisma Expand。

采用 autocommit，不用 BEGIN/COMMIT 或 psql -1 包起来。lock_timeout=3s、statement_timeout=15min；获取锁失败应重新调度。会清理本迁移拥有的无效索引、拒绝冲突权限、清理内容相同的重复行并建索引；属于真实写入。

## billing-owner-v2-contract.sql

独立审批脚本，不能直接加入当前 Prisma migrations 或蓝绿切流。仅在至少14天 V2稳定、两个成功发布、旧实例/回退窗口关闭、owner/重复/影子差异为零且备份已演练后运行。

需要 psql 变量 confirm_billing_owner_v2_contract=true；该确认值来自记录完整的运维审批，不是程序自动证明。脚本的 SQL 检查不涵盖所有时间/发布门禁。lock_timeout=5s，最终删除 reference_id 是旧应用不可逆边界；不能只填 true 强行通过。

## 验证方法

在独立 disposable DB 执行 fresh/history 测试验证 Expand；Contract 需额外准备已回填快照和新代码验证，禁止用旧应用回滚测试去证明 Contract 可逆。新增 SQL 要测试冲突、并发建索引、失败后重试与应用兼容；生产优先应用回退，不临时反向 DDL。
