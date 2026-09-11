# 发布控制器测试替身

无独立 Nx 项目；语义 type:platform/runtime:node/domain:platform（实际 shell 假命令）。仅被父目录测试运行，不能放到用户或生产的全局 PATH。

- [bin](bin/README.md)：假 docker/curl，用于蓝绿发布控制器测试。
- [migrator-bin](migrator-bin/README.md)：假 node/pnpm/psql，用于 migrator 顺序测试。

运行 bash scripts/release/test-deploy-controller.sh 或 bash scripts/release/test-migrator-entrypoint.sh，父脚本在临时目录设置专用环境并清理。这里没有服务凭据，也不应注入真实 DB URL。增加替身行为时同步父测试断言；替身成功不等于真实 Docker/PG 成功。
