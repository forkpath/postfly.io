# @nx/vite 23.0.1 迁移材料

这是 ai-migrations 中一个版本的工具链文档，不是独立 Nx 项目；语义 type:platform / runtime:node / domain:platform。用于 Vite/Vitest 升级评审，不在生产运行，无环境变量/测试入口。

- [Vite 8](ai-instructions-for-vite-8.md)：Vite 主版本配置调整说明。
- [Vitest 3](ai-instructions-for-vitest-3.md)：历史测试配置迁移提示。
- [Vitest 4](ai-instructions-for-vitest-4.md)：后续测试主版本调整提示。

文件是步骤说明，不是脚本。修改前读实际 package.json/pnpm-lock.yaml 与项目配置，修改后执行目标项目的 Nx 验证。不要重复运行已经完成的历史迁移。
