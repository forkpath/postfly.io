# 三种边界检查：为什么加，禁止了什么

这些检查让不合法的依赖或配置写法尽早失败，保护通用库和客户端的运行环境。

## 1. 实际 ESLint 禁止导入检查

[规则](../../eslint.config.mjs)通过 Nx tags 限制跨项目依赖；email/analytics/monitoring core 另外禁止 Node 内置模块、envin、Nest、厂商 SDK、Native SDK 等导入。

[scripts/ci/runtime-boundaries.test.mjs](../../scripts/ci/runtime-boundaries.test.mjs) 不是只搜索配置字符串，而是调用 ESLint.lintText，构造非法导入并断言指定规则真的报错：

- 在 web/mobile 的探针路径导入 analytics-server，以及 analytics/server、monitoring/server、email/server 兼容路径，必须被 module-boundaries 拒绝。
- 在 email/analytics/monitoring core 导入 envin、node:crypto、posthog-node，必须被 no-restricted-imports 拒绝。
- 同时检查 core 不再通过依赖图牵连 Node 实现、前端项目不能到达 Node-tag 项目。

原因：只改 tags 不足以证明 alias、ESLint file patterns 和规则组合生效。非法导入会让浏览器带入服务器依赖、把 server 改动传播到所有前端，甚至暴露秘密。

代价：旧代码导入可能被阻止，必须迁移到 contract/runtime adapter；允许列表需要维护。类型导入也应走 contract，不通过全局关闭规则解决。当前探针不是遍历所有第三方包，也不意味着 JS 动态加载已完全可控。Nx 标签本身是自定义约定，执行机制见 [官方边界文档](https://nx.dev/docs/features/enforce-module-boundaries)。

## 2. 浏览器打包检查

同一测试文件用 esbuild 的 browser 模式，把 email/analytics/monitoring 的 src/index.ts 真正打包到内存（write:false），检查依赖输入中没有 PostHog/Sentry/Resend/envin/AWS/阿里云模块，并检查结果没有指定 GA secret 名称。

它验证的是“这三个 universal 入口可以供浏览器消费，且不会暗中带入相关 SDK/配置求值”，不是禁止浏览器打包，也不是全应用的秘密扫描器。它不代替 Web Vite、Extension WXT 或设备 E2E，未检查的字符串/第三方库仍可能有风险。

代价：少量 CI 计算，新增合法依赖时可能需要调整精确检查；esbuild 与最终 Vite/Metro 行为不完全相同。原则是把有环境要求的实现移到 adapter，而不是简单把所有 SDK 设 external 隐藏问题。

## 3. Expo 环境变量检查

当前 AST 检查**只覆盖** analytics-native/src/env.ts、monitoring-native/src/env.ts：

- 要求静态 process.env.EXPO_PUBLIC_NAME 形式。
- 不允许 process.env[key]/方括号访问。
- 不允许 import.meta，避免把 Vite 配置方式带到 Native。
- 至少检查到三个静态环境引用，避免文件清空导致假通过。

Expo 会在打包时内联公开变量，官方明确要求静态点号引用；动态 key 和解构不会按相同方式内联。`EXPO_PUBLIC_` 值对终端用户可见，不能用于保存秘密。[Expo 官方说明](https://docs.expo.dev/guides/environment-variables/)

正确的 Native 读取例子：

```ts
const endpoint = process.env.EXPO_PUBLIC_API_BASE_URL
```

动态远程配置依然可以使用 API/context/参数注入；这条规则只针对构建时 env 访问，不是禁止所有动态配置。

## 合理性和当前缺口

三类检查合理且互补：lint 验证依赖规则，browser bundle 验证入口闭包，Expo AST 验证特定构建语法。但不能由此宣布整个仓库已经完全运行时隔离。

当前仍需注意：

- billing-client-native/src/lib/env.ts、billing-contract 的公开配置和 api-client 默认地址等仍有动态 env 读取；不在上述两文件检查范围内。
- ui-core 虽标 universal，仍有历史 DOM hooks；消费时不能把所有导出都当作 Native 安全。
- Desktop 单项目含 main/preload/renderer；runtime:web tag 不是独立进程安全审计。
- domain:organization source 规则和 billing 仅依赖 auth contract 的精细约束尚未完整落地。
- 这些检查不验证真实 OAuth、支付、投递、设备操作，也不是生产部署证据。

## 如何运行、如何扩展

```sh
pnpm ci:checks
```

该根脚本运行 scripts/ci/\*.test.mjs，包含实际 ESLint/esbuild/AST 探针和其他治理测试。新 adapter 增加时同时补合法与非法导入、兼容 alias、runtime graph、bundle 与环境变量例子。检查失败先确认规则与架构是否一致，不以删测试或关闭 ESLint 的方式“修好 CI”。
