# README 交付核验 · 2026-09-10

本记录针对本次文档目标，不代表所有迁移波次、应用逻辑、E2E 或生产部署已验收。

## 范围与证据

| 要求                             | 核验依据                                                                                                     | 结果                                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 每个库/应用/服务有用途与使用说明 | 当前目录与逐个 `pnpm nx show project <name> --json`                                                          | 40 个 libs、5 个 apps（含 web-e2e）、3 个 services 均有 README                                           |
| 工具/脚本逐项说明                | tools/scripts 文件清单，对照最近 README 的文件名章节                                                         | 3 个已注册 Nx 工具、ai-migrations 文档工具及脚本功能目录均覆盖；根单文件脚本在 scripts/README 中独立说明 |
| type/runtime/domain 与消费者     | README 对照 51 个非根 Nx 项目的 resolved tags                                                                | 无缺失或不匹配；非 Nx 脚本明确标为语义分类，不假装被 tags 约束                                           |
| 环境来源、变量含义、值来源       | 阅读 env schema、应用 bootstrap、Vite/WXT/Expo 配置、库 public API；另用 TS AST 扫直接访问与 env schema 字段 | 按项目统计228项引用/字段均在对应 README 出现；动态 key 与依赖配置仍需人工审阅，不能由扫描证明安全        |
| 运行、单测与编写方法             | README 命令对照已解析 targets，测试示例链接对照实际文件                                                      | 未引用不存在的具体 Nx run target；无测试项目明确缺口与新增步骤                                           |
| 应用/服务 E2E                    | 5 个 apps、3 个 services README 及 testing.md                                                                | 每项均说明现有入口或缺失 target、所需设施和编写方式，不把 skip/构建当 E2E                                |
| 后续 Nx 分类规则                 | 根 README                                                                                                    | 写出三维选择、生成器查询、实际依赖规则、新增项目清单与未实现的精细边界                                   |
| 三类检查的解释                   | 对照 eslint.config.mjs、runtime-boundaries.test.mjs，并执行治理测试                                          | 解释目的、范围、负面影响、已知盲区；不是禁止执行检查                                                     |

本次新增/重写68份 README，另有环境、测试、边界三份开发指南；目录里原有更细粒度的页面/组件 README 未被无关改写。未恢复已由之前迁移移除的 srv-core/srv-shared/ui-shared 目录，也未清理用户其他脏文件。

## 本次实际执行的验证

- README/源码本地链接检查：75个 Markdown 文件（包含原有嵌套 README、三份新指南及本核验记录），断链0。
- 项目 tags/具体 Nx run 命令核对：51个非根项目，问题0。
- 直接 env/schema 字段 AST 对照：228项按项目计数，未提及变量0；这不是全程序数据流分析。
- `pnpm ci:metrics:test`：12个测试通过，0失败/跳过，包含 ESLint、浏览器内存打包、Expo AST。
- `NX_NO_CLOUD=true pnpm nx run platform-contract:test --run --skipNxCache`：2个测试通过，验证文档中的 Nx 单次测试用法。
- `pnpm ci:nx-cache-contracts`：通过，报告48个代码项目、23个 Vite/27个 Expo 变量、39个固定 workflow Action。
- 对本次文档显式运行 Prettier；仓库默认忽略 Markdown，因此使用独立 ignore-path，仅处理列出的文档文件。

## 明确没有执行/修复的事项

本次只改文档，不执行生产迁移、部署、账户 seed、邮件、支付、EAS、签名或真实云存储请求；没有重跑全应用 E2E，也没有增加缺失的 app 单元测试。

阅读源码发现并记录的限制包括：Web E2E 部分业务 URL 缺 Engine 的 `/v1` 前缀；billing Native 动态 env 尚未被 Expo 检查覆盖；analytics adapter 的注册顺序可能导致 noop；可选 SES provider 的 URL 字面量需修复后才能真实接入。记录这些缺口是为了准确指导使用，不是把文档完成当成相应逻辑已经修好。
