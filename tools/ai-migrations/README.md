# ai-migrations · 工具链升级指引

用途：保存 Nx 迁移生成的人工/AI 操作说明，供升级维护者核对 Vite/Vitest 变更。它不是可执行项目，没有实际 Nx tags；语义分类为 type:platform / runtime:node（涉及构建工具链）/ domain:platform，Markdown 本身无 runtime。

当前内容见 [@nx/vite 23.0.1 指引](%40nx/vite/23.0.1/README.md)。不读取环境变量，没有运行、单元测试或 E2E 命令。按照说明修改应用前，先核对锁定版本与实际 config，再通过对应项目 Nx lint/typecheck/test/build 验证；不要把历史迁移说明直接当作当前代码事实。
