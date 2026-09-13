# 外部 Skills 逐项审查

审查日期：2026-09-12。唯一内容源为 `.agents/skills`。表中的 SHA 是本次观察到的上游提交，**不代表旧安装内容必然来自该提交**；详情、内容摘要及许可证检查见 `tools/skills-maintenance/sources.json`。

本轮仅升级 `nx-generate`。其余保持原内容，不对未知来源建立 fork，不升级 Ray 运行时依赖。`ray-*` 不进入上游更新清单。

后续用户授权的两 Agent 支持调整：`teach-impeccable` 与 `frontend-design` 增加本地补丁，移除退役 Agent 的写文件／专属指令；这不是上游升级。`sources.json` 保留补丁前摘要、原锁摘要与变更理由，现有许可证归属不变。

| Skill | 上游 | 路径 | 判定 | 原因 |
| --- | --- | --- | --- | --- |
| adapt | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| animate | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| audit | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| better-auth-best-practices | better-auth/skills @ 20c9e88a5c00 | better-auth/best-practices | 暂缓，保留现状 | 内容已变化但无法确认安装版本与本地修改归属，保留现状；候选需逐项人工兼容审查。 上游 auth@latest/schema 写入指导不符合 Ray 固定版本治理；源码未发现独立 LICENSE 文件。 |
| bolder | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| building-native-ui | expo/skills @ be95528712e3 | 未确认当前有效入口 | 暂缓，保留现状 | 上游旧入口已重命名/拆分为 expo-native-ui、expo-data-fetching 等；本轮不自动迁移调用方式或 Expo 依赖。 |
| clarify | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| colorize | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| critique | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| database-schema-designer | softaworks/agent-toolkit @ 3027f20f3181 | dist/plugins/database-schema-designer/skills/database-schema-designer | 兼容、内容未变 | 内容与所列完整上游 SHA 完全一致，无需更新；Nx 命令使用本地 pnpm，仓库规则优先。 |
| delight | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| distill | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| extract | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| find-skills | vercel-labs/skills @ d66728281524 | skills/find-skills | 暂缓，保留现状 | 本地内容与原安装锁摘要吻合，未发现安装后修改；但上游结构/行为变更尚未通过兼容审查，保留原版。 动态 npx skills 安装/更新不纳入只读检查。 |
| frontend-design | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| harden | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| link-workspace-packages | nrwl/nx-ai-agents-config @ aa363e4a85f1 | generated/.agents/skills/link-workspace-packages | 兼容、内容未变 | 内容与所列完整上游 SHA 完全一致，无需更新；Nx 命令使用本地 pnpm，仓库规则优先。 |
| monitor-ci | nrwl/nx-ai-agents-config @ aa363e4a85f1 | skills/monitor-ci | 暂缓，保留现状 | 内容已变化但无法确认安装版本与本地修改归属，保留现状；候选需逐项人工兼容审查。 含两个自动 CI 处理脚本，需审查网络、权限及自动修复行为。 |
| native-data-fetching | expo/skills @ be95528712e3 | 未确认当前有效入口 | 暂缓，保留现状 | 上游旧入口已重命名/拆分为 expo-native-ui、expo-data-fetching 等；本轮不自动迁移调用方式或 Expo 依赖。 |
| normalize | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| nx-generate | nrwl/nx-ai-agents-config @ aa363e4a85f1 | generated/.agents/skills/nx-generate | 已升级 | 已升级到上游 generated/.agents 版本：仅规范描述并移除不通用 subagent/context 元数据；完整差异已审核，无脚本/权限/依赖变化，MIT 授权保留于治理目录。 |
| nx-import | nrwl/nx-ai-agents-config @ aa363e4a85f1 | generated/.agents/skills/nx-import | 兼容、内容未变 | 内容与所列完整上游 SHA 完全一致，无需更新；Nx 命令使用本地 pnpm，仓库规则优先。 |
| nx-plugins | nrwl/nx-ai-agents-config @ aa363e4a85f1 | generated/.agents/skills/nx-plugins | 兼容、内容未变 | 内容与所列完整上游 SHA 完全一致，无需更新；Nx 命令使用本地 pnpm，仓库规则优先。 |
| nx-run-tasks | nrwl/nx-ai-agents-config @ aa363e4a85f1 | generated/.agents/skills/nx-run-tasks | 兼容、内容未变 | 内容与所列完整上游 SHA 完全一致，无需更新；Nx 命令使用本地 pnpm，仓库规则优先。 |
| nx-workspace | nrwl/nx-ai-agents-config @ aa363e4a85f1 | generated/.agents/skills/nx-workspace | 兼容、内容未变 | 内容与所列完整上游 SHA 完全一致，无需更新；Nx 命令使用本地 pnpm，仓库规则优先。 |
| onboard | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| optimize | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| polish | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| quieter | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| tdd | mattpocock/skills @ 3cca18b368ae | skills/engineering/tdd | 暂缓，保留现状 | 本地内容与原安装锁摘要吻合，未发现安装后修改；但上游结构/行为变更尚未通过兼容审查，保留原版。 |
| teach-impeccable | pbakaus/impeccable @ cb56ed6c19a0 | 未确认当前有效入口 | 暂缓，保留现状 | 上游已合并为 impeccable 单入口，新增 launcher/二进制下载/hooks；不是原技能原位兼容更新。tests/oracle 下同名 fixture 不得当上游来源。 |
| transitions-dev | jakubantalik/transitions-dev @ 038b0bdc7537 | skills/transitions-dev | 暂缓，保留现状 | 本地内容与原安装锁摘要吻合，未发现安装后修改；但上游结构/行为变更尚未通过兼容审查，保留原版。 |
| vercel-composition-patterns | vercel-labs/agent-skills @ 063bee94c3f4 | skills/composition-patterns | 暂缓，保留现状 | 内容已变化但无法确认安装版本与本地修改归属，保留现状；候选需逐项人工兼容审查。 仓库根未找到 LICENSE 文件，技能元数据授权需单独核验；Next.js/SWR/deep import 示例不得覆盖 Ray。 |
| vercel-react-best-practices | vercel-labs/agent-skills @ 063bee94c3f4 | skills/react-best-practices | 暂缓，保留现状 | 内容已变化但无法确认安装版本与本地修改归属，保留现状；候选需逐项人工兼容审查。 仓库根未找到 LICENSE 文件，技能元数据授权需单独核验；Next.js/SWR/deep import 示例不得覆盖 Ray。 |
| web-design-guidelines | vercel-labs/agent-skills @ 063bee94c3f4 | skills/web-design-guidelines | 暂缓，保留现状 | 内容匹配，但每次从外部 URL 读取浮动规则；仅在明确 UI 审查时人工使用，自动维护暂缓。 仓库根未找到 LICENSE 文件，技能元数据授权需单独核验；Next.js/SWR/deep import 示例不得覆盖 Ray。 |

## 本地修改与版本锁的区别

原有 32 个锁条目中，30 个安装摘要与原锁一致；`monitor-ci` 和 `vercel-composition-patterns` 不一致，保留本地内容并阻止自动覆盖。Better Auth、React Best Practices、Web Design Guidelines 原本缺少锁条目，已补治理来源，但不虚构其旧安装 Commit。

旧 `computedHash` 算法只包含文件路径和内容，不包含执行权限，也不是 Git 版本。维护工具保留兼容算法，同时新增包含文件模式的 SHA-256 内容摘要。已升级项同时记录完整上游 Commit、skillPath 与兼容摘要。

## 首次审查的主要阻断

- Impeccable 的 18 个旧入口已被上游合并为新 skill／commands，且增加启动器、下载与 hooks：不能逐目录覆盖，也不将测试 fixture 误当正式来源。
- Expo 两个入口改名或重组：需要单独评审调用方与名称迁移。
- Better Auth 上游示例包含动态版本／迁移操作：与 Ray 固定工具链和隔离数据库规则冲突。
- 新脚本、远程抓取、许可证未确认、本地内容分歧或框架限定示例均保留现状；人工审批不由内容 hash 替代。
- Nx MIT 许可证副本保留在 `tools/skills-maintenance/licenses/nrwl-nx-ai-agents-config.txt`。

定时工具只生成候选，不能将这些暂缓项自行恢复为可升级。先修改治理记录并完成审查，再准备候选。
