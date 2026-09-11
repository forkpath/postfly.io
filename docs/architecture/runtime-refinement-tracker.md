# Email / Analytics / Monitoring 运行时细化

2026-09-10；当前未提交工作区上的独立改造，不部署、不迁移数据库。

## 决策

值得实施：Nx 的 runtime tag 约束以项目为单位，原三个 universal 项目包含 Node SDK 和多平台环境求值，子路径不能表达独立项目影响范围。细化应保留既有提供方和调用语义，不按每个提供方无限拆库。

- email 保留通用邮件类型；email-server 拥有模板渲染与发送 SDK；server-email 仍是 Nest 注入桥。
- analytics / monitoring 保留无环境求值的策略、类型与注册接口；分别新增 web / native / server 三个运行时项目。
- Web、Desktop renderer、Extension 同属 Web 运行时，共用项目、保留明确入口；不把 Electron main 当 renderer。
- 环境变量按运行时读取。客户端不再合并服务端配置；Expo 只用静态 EXPO_PUBLIC 访问。
- 明确旧子路径兼容映射；移除含混的跨平台 env 入口，并迁移仓内消费者。

## 工作与验证

| 工作 | 状态 | 证据 |
| --- | --- | --- |
| 读取入口、消费者、Nx 合并配置 | 完成 | 原 45 项目图；三个库均为 universal；server SDK 与 env 求值混在项目内 |
| 生成独立 Nx 运行时项目 | 完成 | Nx generator 创建 7 个非独立构建源码库；52 项目 / 120 边 / 0 循环 |
| 迁移实现、入口与调用方 | 完成 | 实现保留；明确平台 alias 兼容；聚合 env 入口移除；仓内调用方已迁移 |
| 行为与环境隔离测试 | 完成 | 新项目 11 个测试通过：提供方选择、注册、邮件 raw/template、无凭据 import、公开变量读取 |
| 项目图与禁止导入回归 | 完成 | CI 治理 12/12，含 5 个新增检查：图、真实 ESLint 新旧入口拒绝、core bundle、SDK 禁止导入、Expo AST |
| 全仓类型/静态规则/已有测试/构建 | 完成 | 禁缓存四目标通过：49 项目 + 3 依赖任务；日志 /tmp/ray-runtime-full.log |
| 指南和 HTML 更新 | 完成 | 指南、运行时说明、模块 README、HTML 第 10 节；静态交互检查 10 节 / 52 节点 / 120 边通过 |

详见 [运行时细化说明](runtime-refinement.md)。本轮未执行真实提供方、原生设备 E2E、部署或数据库迁移。新增模块不改变应用缺少独立单测 target 的现状。无关脏工作区成果保留，没有代替用户提交或发布。
