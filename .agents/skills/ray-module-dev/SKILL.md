---
name: ray-module-dev
description: Ray 全栈任务编排与页面交付；用于跨 Engine/Pulse/client/Studio 的功能、Web/Desktop 页面路由、导航、表格、错误和缓存处理。后端规则交由 ray-api-flow 与 REST/WS 专项技能；Mobile/Extension 读取专属约束。
---

# Ray 全栈编排

先确认目标端、已有功能、用户路径、资源归属、UI 状态和交付门禁。不要假设所有任务都需要 DB、API 或实时消息。

## 按需阅读

- 有后端接口：使用 ../ray-api-flow/SKILL.md，再选择 REST 或 WebSocket 技能；不重复定义另一套后端标准。
- 跨库/跨端：读取 ../ray-api-flow/references/runtime-libraries.md。
- Web/Desktop 页面：读取 [Studio 与路由](references/studio.md)。
- Mobile：使用 building-native-ui；有网络请求再使用 native-data-fetching，核验 native auth/UI adapter。
- Extension：先读取当前 apps/extension 配置及入口；按 background/content/popup 权限设计，不引入 Node/Studio 依赖。

## 编排

1. 资源与权限、模型复用、契约及业务层先确定（接口任务执行公共顺序）。
2. 根据已验证 API 建 query/mutation，明确身份隔离和 invalidation。
3. 在 Studio 做 Web/Desktop 共用页面，app route 仅接路由参数、guard、loader、平台配置。
4. 接入导航、翻译、空态、加载、错误、禁用状态及可访问性。
5. 分别核验两端真实路径与 API origin；共享组件通过不等于两个应用都集成成功。
6. 向用户交付影响文件、实际通过命令、未跑/阻断环境、剩余风险；不能把测试文件存在描述为 E2E 通过。

不要删除可选 framework adapters 或兼容 API 来“简化”生成任务。
