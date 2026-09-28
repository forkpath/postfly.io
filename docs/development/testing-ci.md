# 测试、CI 与发布门禁

CI 检查当前提交是否仍能安装、编译并满足框架行为契约；CD 在检查通过后使用
该提交构建的产物发布或部署。单测随开发运行并进入 PR，集成与 E2E 按影响范围
进入 PR，完整矩阵在默认分支、定时任务及发布前运行。

## 调度

`.github/workflows/ci.yml` 对所有 PR 触发，避免必需检查因路径过滤一直等待。
选择脚本使用 Nx 的受影响项目图，因此共享库变化会连带选择其消费者。

| 套件 | PR 选择条件 | 默认分支、定时、手动、发布 |
| --- | --- | --- |
| lint/typecheck/typecheck-tests/test/build | Nx affected | 全部 |
| PG 迁移与 schema | 每次 | 每次 |
| Engine/Pulse/Worker 集成与 E2E | 对应服务受影响 | 三服务 |
| Chromium 扩展 | Extension 受影响 | 执行 |
| Web 正式构建页面 | Web/web-e2e 受影响 | 三浏览器 |
| Desktop | Desktop 受影响 | macOS 两架构、Windows、存储发布契约 |
| Mobile Android | Mobile 受影响 | 执行 |
| Mobile iOS | Mobile 受影响且原生依赖/配置变化 | 执行 |

测试编排、CI/发布脚本、Docker 配置和 workflow 的变化选择完整 E2E 矩阵。
普通文档变化可不启动设备/后端套件。无法解析影响图时检查失败；找不到基线
提交时保守执行完整矩阵。所有 job 都固定到本次提交，设备与真实网络套件
不使用 Nx 结果缓存。Node/pnpm、Maestro、设备工具版本及测试容器已固定。

`Required checks` 必须成功：基础检查失败、取消，或者应跑套件缺失/跳过，
都会返回失败。只有明确没有被选择的套件可以显示 skipped。
JUnit、trace、失败截图、构建/服务日志由各 job 的 `always()` 步骤上传。
Web 的历史厂商/业务账户场景不在默认框架页面套件中，不计作已通过。

## 仓库合并规则

在仓库 Settings → Rules → Rulesets / Branches 为受保护分支添加 `Required checks`，
并要求合并前更新检查。YAML 成功运行与 GitHub 实际阻止合并是两件事，不能
仅凭 job 名称宣称已经启用保护。

本次查询 `forkpath/postfly.io`：默认分支 `arch` 尚未受保护；私有仓库 rulesets
接口返回需要升级 GitHub 方案或改为公开的 403。没有修改仓库可见性或订阅。
因此实际合并阻断必须在账户能力可用后配置并复验，详见验收记录。

## 发布前后

- Extension：版本标签 → 同一 SHA 的完整 CI → 正式 Chrome/Firefox ZIP →
  解压 Chrome ZIP 并执行 `extension:e2e-artifact` → 发布原 ZIP、校验和与提交号。
  Firefox 当前只证明构建通过，未宣称实际扩展行为验收。
- 服务：检查提交属于 `RELEASE_BRANCH`（默认仓库默认分支）→ 同一 SHA 的完整
  CI → 按正式配置构建五个本地镜像 → 在独立 PG/Redis/Mongo/RabbitMQ 中运行
  migrator 与四个应用 → 检查就绪、页面、HTTP 会话/授权和 WS 授权 → 核对镜像
  ID 未变化后推送 → 按 registry digest 部署 → 通过公开 Kong 入口运行框架探针。
- 任何前置步骤失败，都不能进入后续发布步骤。发布命令还独立检查报告成功、
  清理完成、提交号以及镜像 ID；不能把失败报告或后来替换的镜像拿去发布。
- 部署后探针不创建账户、不写业务数据，不要求生产测试密码。已有专用账号
  探针仍可显式启用。部署失败不自动撤销 schema；回退入口与备份要求见
  [部署指南](../architecture/deployment.md) 和 [发布脚本说明](../../scripts/release/README.md)。

本地可复现的入口：

```sh
pnpm ci:checks
pnpm ci:nx-cache-contracts
EXTENSION_BUILD_DIR=/absolute/path/to/extracted/chrome pnpm nx run extension:e2e-artifact
RAY_RELEASE_IMAGE_PREFIX=local/ray RAY_RELEASE_IMAGE_TAG=<40-character-commit> node scripts/testing/run-backend.mjs release artifact
SMOKE_BASE_URL=https://your-deployed-origin node scripts/release/framework-smoke.mjs
```

镜像验证入口只运行已存在的五个镜像，不重建、不发布。镜像 ID、日志、运行与
清理状态在 `dist/test-results/release/artifact/<run-id>/`。负向发布演练使用记录
命令替身，证明失败报告不会触发 push；它不等同于真实 registry 或生产部署验收。

Mobile 商店包、Desktop 签名/公证升级，以及真实厂商账户继续作为专项验收，
不能用无签名测试包通过代替。当前通过与阻碍见 [验收记录](testing-framework-validation.md)。
