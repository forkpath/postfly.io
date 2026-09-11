# CI 脚本 · 指标、缓存与运行时边界

无独立 Nx 项目；语义 type:platform/runtime:node/domain:platform。供 GitHub runner 与维护者，从根运行；业务代码不导入。下列 Node 测试不连接生产。

| 文件                             | 用途与入口                                                                                       | 输入、输出与注意事项                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| run-nx-with-metrics.mjs          | node scripts/ci/run-nx-with-metrics.mjs --phase=validation -- pnpm nx run common:typecheck       | 真正执行分隔符后的命令，记录 .nx/cache/run.json；先移除旧 run.json，避免假数据。输出到 CI_METRICS_DIR 或 artifacts/ci-metrics，保留子进程退出码            |
| nx-baseline.mjs                  | buildNxBaselineSummary 纯计算库，由 summarize 调用                                               | 校验样本数量/同 SHA/禁缓存/任务集合等，不触发 GitHub workflow                                                                                              |
| summarize-nx-baseline.mjs        | pnpm ci:metrics:baseline --metrics-dir=artifacts/ci-baseline-samples --expected-samples=5        | 汇总下载的指标 JSON，默认输出 artifacts/ci-baseline-summary/baseline.json；不会自动承认候选 baseline 为生产证据                                            |
| evaluate-nx-metrics.mjs          | pnpm ci:metrics:evaluate --baseline-median-ms=<真实基线毫秒>                                     | 默认读取 artifacts/ci-metrics，phase=validation，至少10样本、40%提速、70%命中及同 SHA 远程命中证明；--metrics-dir/--phase/--output 可指定，门禁不满足退出1 |
| check-nx-cache-contracts.mjs     | pnpm ci:nx-cache-contracts                                                                       | 静态检查项目/副作用缓存/显式 env inputs/Action pin 等；不测真实远程命中率                                                                                  |
| check-container-contracts.sh     | pnpm ci:container-contracts，或 bash scripts/ci/check-container-contracts.sh --require-artifacts | 需要 Docker Buildx/registry；检查 Dockerfiles、Compose 与发布 fixtures；可验证已存在产物。不代表镜像真部署或 provider E2E                                  |
| generate-nx-migration-review.mjs | pnpm docs:nx-migration-review                                                                    | 写 docs/architecture 下报告，读取工作区图等；不会重新执行报告里引用的业务测试                                                                              |
| nx-baseline.test.mjs             | pnpm ci:metrics:test                                                                             | Node test 验证 baseline 样本拒绝/统计等逻辑                                                                                                                |
| server-boundaries.test.mjs       | pnpm ci:metrics:test                                                                             | 检查旧项目/别名退出、服务直接依赖、路径配置；扫描 Markdown，文档示例也不能引入已移除 alias                                                                 |
| runtime-boundaries.test.mjs      | pnpm ci:metrics:test                                                                             | 运行真实 ESLint 非法导入探针、三个 core 浏览器打包、两份 Native env AST 检查；范围详见边界说明                                                             |

## 环境变量

脚本通常只继承进程环境，不自行加载 `.env`。

- `CI_METRICS_DIR`：指标输出目录，由 workflow 或本地维护者指定。
- `CI_METRICS_SAMPLE_ID` / `CI_METRICS_RUNNER_LABEL`：样本身份与机器标签，由 workflow 设置。
- GitHub 前缀变量、`RUNNER_OS` / `RUNNER_ARCH`、`GITHUB_STEP_SUMMARY`：由 GitHub runner 提供，外部无需伪造。
- `NX_CLOUD_ACCESS_TOKEN`：来自 GitHub secret，脚本仅记录是否配置，不输出值。
- `NX_NO_CLOUD` 等执行选项：由子进程继承。

run-nx-with-metrics 会执行你传入的任意命令，因此安全程度取决于命令，不能当成只读统计器。报告是文件写入，下载样本/发布 HTML 要评审来源。所有输出不得包含秘密。

## 编写测试

在本目录新增 \*.test.mjs，用 node:test + assert、临时文件夹与子进程替身。纯统计不接网；调用 Nx/ESLint/esbuild 的治理测试检查失败与成功路径。pnpm ci:metrics:test 运行全部这些文件，目前没有该目录独立 Nx target，不能编造 nx test ci。

新增 env/adapter 时同步 [边界说明](../../docs/development/boundary-checks.md) 中的覆盖范围；全绿只证明这些具体检查，不能把 0 测试项目当已覆盖。
