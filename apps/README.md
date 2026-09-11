# 客户端应用与 E2E runner

本目录为分类容器，本身不是可执行 Nx 项目，无独立 type/runtime/domain 或环境变量。各项的实际 tags、消费者、配置、运行、单元测试及适用的 E2E 方法见其 README；不要从目录名推断 runtime。

| 项目                             | type / runtime / domain                        | 用途                                                                                                                                                          | 当前标准单元测试             |
| -------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| [desktop](desktop/README.md)     | type:app / runtime:web / domain:composition    | Electron 桌面应用，main/preload 使用 Node/Electron，renderer 使用共享 Web/Studio 页面。当前 Nx 单项目标 runtime:web，是共享依赖边界，不是所有文件都纯浏览器。 | 无 test target（不是已测试） |
| [extension](extension/README.md) | type:app / runtime:web / domain:composition    | WXT 浏览器扩展，包含 popup/content/background 交互，使用 Web 认证、API 和监控。                                                                               | 无 test target（不是已测试） |
| [mobile](mobile/README.md)       | type:app / runtime:native / domain:composition | React Native + Expo Router 移动应用，组合 Native 认证/UI、RevenueCat 购买、分析监控；build 是本地 export，不等于 EAS 二进制发布。                             | 无 test target（不是已测试） |
| [web](web/README.md)             | type:app / runtime:web / domain:composition    | TanStack React Start 的营销站与 SaaS Web 应用，组合 Studio/UI、客户端认证、API 与分析监控；production build 输出 .output。                                    | 无 test target（不是已测试） |
| [web-e2e](web-e2e/README.md)     | type:app / runtime:node / domain:composition   | Playwright Web + API 端到端测试 runner，启动生产 Web bundle 或连接外部测试站点；不是产品 app，也不是 Web 单测。                                               | 无 test target（不是已测试） |

从根执行 `pnpm nx show project <name> --json` 确认运行目标，开发入口和环境加载见[根 README](../README.md)。有测试目标不代表所有功能有单测；现有 smoke/构建也不代表 E2E 完整。新增项目时同步本索引。
