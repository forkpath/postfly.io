# Scripts · 工作流入口与安全边界

脚本由开发者/CI/发布维护者运行，不是应用可导入的业务库。大部分不独立注册 Nx 项目；下列 type/runtime/domain 是语义分类，不是已经执行的 tags 规则。所有命令从仓库根运行。

## 子目录

| 目录                               | 用途与分类                                      | 运行/测试                     |
| ---------------------------------- | ----------------------------------------------- | ----------------------------- |
| [auth](auth/README.md)             | schema 对照；platform/node/auth                 | pnpm nx run auth-server:schema-check |
| [ci](ci/README.md)                 | CI 指标、缓存与边界治理；platform/node/platform | pnpm ci:metrics:test 等       |
| [migrations](migrations/README.md) | PG 预检/升级/回填；platform/node/platform       | 专用 Nx targets；有写库操作   |
| [release](release/README.md)       | 不可变发布/回退/探针；platform/node/platform    | 运维环境执行；测试用 fixtures |

## clean.mjs

用途：递归按目录 basename 删除依赖、构建和缓存；语义 platform/node/platform，供明确需要重建本地环境的开发者。

```sh
pnpm clean:dry-run
```

真实清理由 pnpm clean 执行，**不是本轮文档验证命令**。它还会整体删除 apps/mobile/ios 与 apps/mobile/android，以及匹配的 Pods/.gradle/build/.metro 等目录；如果原生工程中有人工作，可能丢失未提交内容。先审 dry-run，备份/提交，再决定执行。不是只删除 .nx，也不能保证所有删除物都可重建。无业务 env，不配置生产凭据。当前无单测；改动前应在临时 fixture 仓库测试匹配、dry-run 不写入与路径范围，禁止以真实仓库做删除测试。

## create-engine-lockfile.js

暂时保留。它读取 Engine 的 dist manifest 并生成裁剪 lockfile。2026-09-10 实测标准 package 链路失败：prune-lockfile/copy-workspace-modules 要求服务源码 package.json，当前 integrated workspace 没有该文件。新链路尚不能证明完整替代，因此不能安全删除此脚本；它也不覆盖 Pulse/Worker。后续打包方案完成替代验证后再移除，见[清理记录](../docs/development/legacy-cleanup.md)。

## deploy.sh

旧部署命令的安全入口；语义 platform/node/platform，供运维使用。bash scripts/deploy.sh --help 只展示说明；git-pull/现场 build/update 路径已禁用。

rollback/finalize 转交 release/deploy-blue-green.sh，会操作真实环境，所需 env 与验证见 [release](release/README.md)。不用于本地启动；不要用旧脚本参数绕过 immutable 发布。测试由发布控制器 fixtures 提供，帮助文本本身不是部署证明。

## sync-commands.sh

语义 platform/node/platform（实际 shell 工具），同步 .agents/commands 下 Markdown 到 .cursor/.claude/.codex 的相对软链接。pnpm sync:commands 执行；无业务 env。不自动覆盖已有入口，仅创建缺少的链接。维护指南先改源文件。无单测；改动在临时目录验证路径、缺源目录、重复执行和已存在文件。

## sync-skills.sh

语义 platform/node/platform（实际 shell 工具），pnpm sync:skills 同步 .agents/skills 到上述工具目录。无业务 env。现有条件可能对已存在非软链接路径调用 ln -sf，运行前检查目标，不能把它当纯只读命令。无独立单测；修改时为真实目录/软链接/断链/重复执行建立临时 fixture，防止覆盖用户文件。

## 新脚本要求

小脚本可维持单文件并在本 README 写独立章节；一个功能有多个文件时建立目录与 README。给出参数、输入来源、输出位置、退出码与副作用。确定性维护任务可注册 Nx target；迁移、发布和外部写入明确 cache:false。缺少测试要说明，不能把 node --check 的语法通过当行为测试。
