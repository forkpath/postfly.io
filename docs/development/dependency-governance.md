# 依赖维护与安全检查

依赖版本以根 `pnpm-lock.yaml` 为准，使用 `packageManager` 指定的 pnpm。
应用自己直接导入的包应在该应用的 manifest 中声明；跨应用共享的版本放在
`pnpm-workspace.yaml` 的 catalog 中。根 manifest 仍为没有独立 package 的
Web、后端和共享库提供依赖，不能因为 Mobile 也使用某个包就从根删除它。

## 分组更新

`.github/dependabot.yml` 每周检查 pnpm 和 GitHub Actions，Nx、Expo/React Native、
Better Auth、Prisma 按关联工具链分组，其他依赖的 minor/patch 更新分为开发和运行时组。
所有更新通过 PR 审核，不自动合并。Nx 升级需要检查迁移，Expo 更新需要验证完整
SDK 配套版本；分组本身不能证明版本兼容。

配置不指定 `target-branch`，以便安全更新使用默认分支配置。建立 dev/main 策略时，
默认开发分支需要与此同步。pnpm 的根锁文件覆盖 Mobile、Extension 和 tools 的
workspace importer，不另外维护应用锁文件。

## 官方源扫描

`Dependency security` 工作流在 PR、dev/main 推送、每周定时及手动触发时运行：

```sh
pnpm audit --registry=https://registry.npmjs.org --audit-level=high --json
```

检查根锁文件，无需安装依赖，也不执行依赖的生命周期脚本。高危或严重告警返回非零，
网络或 registry 错误也按失败处理。报告上传为 `dependency-audit`，保留 7 天。
需要将该检查与 `Required checks` 一起纳入 dev/main 的合并保护。

处理告警时先检查实际依赖路径、受影响版本和调用方式，优先升级直接依赖与对应工具链。
传递依赖 override 必须限定版本范围并通过相关构建和测试。不要自动执行 audit fix、
忽略全部未修复告警，或把扫描失败写成扫描通过。

## 2026-09-30 基线与待完成事项

- 不安装任何依赖的干净目录扫描已复现：退出 1，且没有生成 `node_modules`。
  报告统计为 low 29、moderate 144、high 158、critical 8；这些是扫描器统计，
  不能等同于相同数量的可利用应用漏洞。46 个依赖包涉及 high/critical 告警。
- 清单及来源保存在 `dist/test-results/hardening-20260930/audit-remediation-inventory.json`。
  依赖修复、复扫及远端必需检查尚待完成，当前不能声称安全门禁已通过。
- AST 导入检查发现 Mobile 未显式声明其直接使用的 `dayjs`；Extension 的
  Playwright、Vitest、React Testing Library 仍依赖根工具安装。后续会补齐项目声明，
  并复查共享 catalog 和冻结安装，不为缩小根 manifest 而破坏共享库解析。

选项依据：[Dependabot 官方参考](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)、
[pnpm audit](https://pnpm.io/10.x/cli/audit)。
