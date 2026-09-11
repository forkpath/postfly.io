# Ray · 跨端 SaaS 开发框架

Ray 是 Nx monorepo：Web、Electron、Expo、浏览器扩展共用契约和适配库；Engine、Pulse、Worker 分别承载 HTTP API、WebSocket 和后台消息消费。可选邮件、短信、存储或搜索能力不能因示例应用暂未使用而被当作废弃代码。

## 开始阅读

- [应用](apps/README.md)、[服务](services/README.md)、[库](libs/README.md)：逐项目的用途、实际 tags、环境、运行和测试。
- [工具](tools/README.md)、[脚本](scripts/README.md)：维护入口、副作用和安全边界。
- [环境配置](docs/development/environment.md)、[测试开发](docs/development/testing.md)、[边界检查](docs/development/boundary-checks.md)。
- [架构报告](docs/architecture/ray-nx-migration-review.html)、[框架指南](docs/architecture/ray-framework-nx-guide.md)；实时配置以源码及 `pnpm nx show project <name> --json` 为准。

## 安装与运行

命令在仓库根执行。使用 Node 24（CI 固定 24.14.1）、pnpm 10.25.0 和受控 lockfile。

```sh
pnpm install --frozen-lockfile
pnpm nx show projects
pnpm nx graph
```

从 .env.example 手工建立未跟踪的根 .env，替换所需配置，不覆盖已有文件或使用生产凭据。需要基础设施时先启动隔离 Docker 环境：

```sh
pnpm docker:dev
pnpm exec dotenv -e .env -- pnpm nx run pg-dao:generate
pnpm dev:engine
```

另开终端执行 `pnpm dev:web`。其他入口为 `pnpm dev:desktop`、`pnpm dev:mobile`、`pnpm dev:extension`、`pnpm dev:pulse`、`pnpm dev:worker`。启动服务不会自动初始化或迁移数据库；首次建库及后续升级见 [迁移说明](scripts/migrations/README.md)。

## 新项目如何选择 type / runtime / domain

这三者都是本仓库自定义的 **Nx tags 字符串约定**，不是 Nx 强制内置分类。`scope:*` 也是常见约定，不是必须保留的特殊字段。每个源码/可执行项目各选一个维度值；不要仅按目录名机械分类。

| 维度                  | 取值与选择方法                                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| type：承担什么职责    | app 可执行组合入口（包括 services/E2E runner）；feature 页面/业务流程；data-access API/持久化访问；contract 类型、校验、接口；ui 组件主题；util 通用工具；platform 框架/厂商适配 |
| runtime：代码在哪运行 | universal 无专属运行时依赖；web 浏览器/DOM；native React Native/Expo；node Node/Nest/数据库/CLI                                                                                  |
| domain：属于谁        | auth 认证权限；billing 计费；organization 组织；shared 跨业务基础；platform 基础设施；composition 显式组合多个业务域的入口                                                       |

```json
{
  "tags": ["type:data-access", "runtime:node", "domain:billing"]
}
```

- 新 Nest 服务放 services，通常 app/node/composition，不是 type:service。
- 组织请求契约通常 contract/universal/organization；Web 页面通常 feature/web/具体业务域。
- 独立维护 CLI 通常 app/node/platform；被其他工具调用的适配库可用 platform/node/platform。
- tools/auth-schema 这样的依赖隔离包在 package.json 的 nx.tags 中声明。普通 shell 脚本不是 Nx 项目，README 分类只是语义说明，不会自动受到图与 ESLint 约束。
- Desktop 当前 tag 是 runtime:web，约束其共享依赖；它仍含 Electron Node 主进程。新增可复用主进程能力应拆出 node 项目，不能从 renderer 引入。
- 不用多 runtime 或 runtime:mixed 绕过限制。需要跨端功能时拆分 contract/core 和 web/native/node adapter。

### 通过 Nx 创建项目

先查已安装 generator 和选项，使用本仓库固定版本。以下尖括号名称是待替换占位符：

```sh
pnpm nx list
pnpm nx list <plugin>
pnpm nx g <plugin>:<generator> --help
```

确定目录/public API/tags 后生成；generator 不支持 tags 参数时在生成的配置中显式添加。用 `pnpm nx show project <name> --json` 核对插件推导的真实 targets，不能只看 project.json 或 tsconfig.spec 是否存在。

源码库一般使用 src/index.ts 和显式 TS alias，不要求每个库都建 package.json。仅在需要独立依赖、发布或工具隔离时增加 workspace package。跨项目只能走声明的 public entrypoint，禁止任意深层源码路径。

### 当前实际依赖规则

规则在 [eslint.config.mjs](eslint.config.mjs)，多个维度同时约束：

- universal 只依赖 universal；web/native/node 各依赖自身 runtime 或 universal。
- util → util；contract → contract/util；ui → ui/contract/util。
- data-access → data-access/platform/contract/util；platform → platform/data-access/ui/contract/util。
- feature/app 可组合上述库，但不能依赖其他 app。
- shared/platform 只能依赖 shared/platform；auth 可加 auth；billing 可加 billing/auth；composition 可组合已列出的全部业务域。

当前限制：尚无 domain:organization 的 source 规则，billing → auth 也未进一步限定为 auth-contract。新增组织库或新 domain 时必须同步完善 depConstraints 和正反例检查，不能把目标架构写成已经实现。

### 新项目交付清单

1. README 写用途、tags、消费者、环境变量名称/含义/来源、运行与单测方法；应用/服务额外写 E2E。
2. 有源码就配置 lint/typecheck；有行为就写真实 test。没有独立 build 的源码库随消费者编译，不创建空任务冒充产物。
3. 确定性任务声明真实 inputs/outputs；影响产物的 env 加入缓存输入。迁移、部署、签名、EAS、上传等副作用不能缓存。
4. 新 API 遵循 [.agents/commands/setup-saas-feature.md](.agents/commands/setup-saas-feature.md) 的完整分层流程；所有权来自 Session。
5. 验证 graph、合法与非法导入、新项目及消费者的任务；run-many 跳过不存在的 test 不算测试通过。
6. E2E 使用隔离数据和 provider mock，检查非零用例与 skip，清理测试数据。

## CI 和缓存

本轮逐目录文档的范围、校验结果与未执行事项见 [README 交付核验](docs/development/readme-audit.md)。

`pnpm ci:affected` 验证受影响的现有任务，`pnpm ci:all` 全量执行已有 lint/typecheck/test/build。Tags 约束架构，不直接产生缓存命中。Nx 本地缓存、affected、单机并行无需付费 Cloud；Cloud 提供额外的远程复用和可选执行能力。

本手册不是“已部署生产”或“所有 E2E 通过”的声明。各项目 README 会明确当前能力与缺口。
