# 按运行时选择 public API

先用 Nx resolved project config 和图核验以下路径仍存在；本表是职责导航，不是所有导出均可用的承诺。

| 需求 | 选择 |
| --- | --- |
| Auth 类型 / 客户端 / Node | auth-contract / auth-client-web 或 auth-client-native / auth-server；Nest 桥接仅已声明的 auth-server/nest |
| Billing 契约 / 持久化 | billing-contract / billing-server；native 用 billing-client-native；billing-client-web 当前是占位，勿虚构 SDK |
| HTTP schema / transport / query | payload / api-core / api-client |
| 跨域工具 / 翻译 | common / i18n；不要把业务域新常量全塞进 common |
| Email 类型 / Node 模板与发送 | email / email-server；server-email 为可选 Nest 集成 |
| Analytics / Monitoring | 无环境 core + 对应 -web、-native、-server adapter |
| UI | ui-core 通用 token/资源；ui-web 浏览器；ui-native RN |
| 共享页面 | studio，仅 Web 与 Desktop renderer |
| Server | server-kernel 契约；server-nest、server-redis、server-rabbitmq 显式装配 |
| 可选框架能力 | server-elasticsearch、server-sms、server-email、server-storage；没有应用消费者也不自动删 |
| 持久化 | pg-dao、mongo-dao，仅 infrastructure / Node composition |
| 跨进程事件 | platform-contract，版本兼容不能只靠 TypeScript interface |

Web/Desktop renderer 使用 web adapters，不导入 Node 服务、Prisma 或 Nest。
Desktop main/preload 与 renderer 边界通过受控 IPC，不能让页面直接获得任意文件/进程能力。
Mobile 使用 native UI/auth/analytics/monitoring；不要引用 studio 或 DOM。
Extension 使用浏览器兼容库，并区分 background/content/popup 的权限、存储与消息边界；不能把 Electron 或 Node 假设带入。
universal 不依赖 node/web/native 专属库。App 不相互引用。
Type/Runtime/Domain 都是仓库自定义 Nx tags，不是业务权限或服务内部层次的自动证明。
只用项目 public API 或 tsconfig 显式声明且有边界的子入口；不能恢复任意深层路径映射。
旧 auth/billing/srv-core/srv-shared/ui-shared 路径不作为新代码模板；不能删除仍存在的 common/studio/email/i18n 等受支持库。
