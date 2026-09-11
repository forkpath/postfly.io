# 框架能力恢复：验证记录

日期：2026-09-08。对象：当前未提交的 Ray 工作树，不是已发布版本。本轮没有部署、执行生产迁移或调用真实短信/邮件/存储提供方。

## 要求与证据

| 用户要求 | 当前交付 | 验证 |
| --- | --- | --- |
| 不因当前无消费者删除框架能力 | Elasticsearch、SMS、Email Nest、Storage 四个可选 adapter；各有公共入口和接入 README | Nx 识别四个项目；类型、静态规则和 11 个测试通过；默认未加入应用 AppModule |
| 说明 Email/Storage 是否有替代 | 指南第 1 节记录契约差异；Email 原始发送与模板发送分离；通用 Storage 恢复 | 核对旧 wrapper 与当前接口；默认 Nest 邮件注册无需密钥；存储分页/错误契约测试通过 |
| 解释 Nx、tags、CI/CD 与 Cloud | 指南第 2–6 节，HTML 第 2 节 | 对照解析后的项目图、nx.json、ESLint、三个 workflow 与官方文档；不声称已验证付费套餐或远程命中 |
| 说明 tools/scripts 何时由谁使用 | 指南第 7–8 节及两个目录 README | 对照 package scripts、Nx targets、workflow、脚本调用关系；区分只读、测试替身和真实副作用 |
| 是否每个 service/app 都使用 Vitest | 指南第 9 节及 HTML 测试矩阵 | 三服务 test=Vitest；四产品 app 无标准 test；web-e2e 是 Playwright，不是 Web 单测 |

## 实际完成的检查

### 全量任务

```sh
pnpm nx run-many -t lint,typecheck,test,build --all \
  --nxBail --skipNxCache --outputStyle=static --parallel=4
```

退出码 0；Nx 输出：`Successfully ran targets lint, typecheck, test, build for 42 projects and 3 tasks they depend on`。

这表示存在对应 target 的项目通过，不代表 45 个图项目都有四种任务，也不代表没有 target 的 app 已被单测覆盖。日志中的 Node 颜色和既有 Nx Vite 插件弃用告警仍存在。

本地原始日志 `/tmp/ray-framework-full-verification.log`，SHA-256：`cc1db0fac2a60b9411ccf3689594c1d3ca63e57ed5b441d4248ab980006815ad`。临时日志可能被系统清理，命令可重跑；校验和用于识别本次日志，不是工作树版本签名。

### 恢复模块与服务测试

| 项目 | 本次通过数量 | 代表性范围 |
| --- | ---: | --- |
| server-elasticsearch | 1 | Nest 注册、配置参数与服务导出，无搜索请求 |
| server-sms | 3 | Nest DI、SDK 请求参数、错误返回和缺配置 |
| server-email | 3 | raw sender 注入、默认延迟加载、正文检查/错误传播 |
| server-storage | 4 | S3/OSS 分页、S3 批量及部分失败、OSS 错误传播、根前缀拒绝 |
| engine | 45 | 当前领域、应用层、查询和控制器断言 |
| pulse | 4 | 当前网关鉴权/组织相关断言 |
| worker | 7 | 当前 consumer 与 registry 断言 |
| auth-server | 5 | 当前认证配置契约断言 |

测试代码不是空占位，但数量也不表示行覆盖率或完整行为覆盖。真实 SDK 网络响应、邮件到达率、短信投递、存储签名权限、Redis 多实例与 RabbitMQ 投递仍需隔离集成环境。

### 治理检查

- `pnpm ci:metrics:test`：7/7，通过。
- `pnpm ci:nx-cache-contracts`：通过；41 code projects、39 pinned workflow actions、23 Vite 和 27 Expo 环境变量等静态契约。
- `node --test scripts/release/migration-policy.test.mjs`：6/6，通过。
- `node scripts/release/check-migration-policy.mjs --mode=static`：通过，8 个 migration。
- `bash scripts/release/test-migrator-entrypoint.sh`：通过。
- `bash scripts/release/test-deploy-controller.sh`：通过。使用假 docker/curl 等验证回退顺序、manifest、RTO 超限及守卫；输出中的预期错误属于拒绝路径测试，不是真实生产事故。
- `git diff --check`：通过。

### 容器检查未完成

`pnpm ci:container-contracts` 停在 Docker 获取 `node:24.14.1-alpine` 元数据阶段。已停止该检查进程，退出码 143；不能计为通过。上面的本地发布脚本检查是独立补跑结果，不替代 Dockerfile/Compose 完整检查，也不证明真实发布 RTO。

### 文档和交互

`pnpm docs:nx-migration-review` 成功刷新 HTML：45 项目、106 条有类型的依赖边、0 循环。同一对项目可能同时有 static/dynamic 边，因此边数不是去重后的项目对数。

jsdom 静态执行验证：9 个章节、45 个图节点、106 条边；无脚本异常或重复 ID；锚点有效；四个恢复模块的搜索和消费者详情通过；项目表过滤通过。这不是浏览器截图或真实布局验收。

本轮未重跑 Web E2E。HTML 的 3 通过/15 跳过是明确标记的上一轮记录，不能证明当前完整 SaaS 流程。生产部署、Contract Migration、Cloud 远程命中和真实提供方测试均未执行。

入口：[开发者指南](ray-framework-nx-guide.md) · [交互 HTML 报告](ray-nx-migration-review.html)。
