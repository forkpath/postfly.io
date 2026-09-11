# server-elasticsearch

## 用途

可选 Nest Elasticsearch adapter，保留框架搜索扩展能力，不自动建业务索引。

## Tags、使用者与场景

`type:platform` · `runtime:node` · `domain:platform`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

显式引入搜索能力的 Node Nest 模块；当前无业务消费者也不代表应删除。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

通过 ConfigService.elasticsearch 对象注入；host/port/apiKey 等由宿主映射，不自行加载 env。当前 HTTP 接入，托管 TLS 要先扩展契约。

| 变量                                                                                       | 含义                       | 何时配置/默认         | 值从哪里来                                                     |
| ------------------------------------------------------------------------------------------ | -------------------------- | --------------------- | -------------------------------------------------------------- |
| `ELASTICSEARCH_HOST` / `ELASTICSEARCH_PORT` / `ELASTICSEARCH_API_KEY`                      | 搜索服务主机、端口、认证   | 启用搜索模块时配置    | ES 管理员；当前模块拼接 HTTP host/port，不接受随意填 HTTPS URL |
| `ELASTICSEARCH_MAX_RETRIES` / `ELASTICSEARCH_REQUEST_TIMEOUT` / `ELASTICSEARCH_DATA_INDEX` | 重试次数、超时毫秒、索引名 | 默认 3/30000/neo_data | 服务容量/索引规划，模块不自动创建业务索引                      |

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project server-elasticsearch --json
pnpm nx run server-elasticsearch:lint
pnpm nx run server-elasticsearch:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run server-elasticsearch:test --run
```

mock SDK 测注册/配置传递；真实索引/搜索、TLS 与权限另在隔离 ES 验证。

现有用例示例：[src/elasticsearch.spec.ts](src/elasticsearch.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。

## 接入细节与厂商契约

可选的 Nest Elasticsearch adapter。框架保留接入能力；当前应用不需要搜索时无需导入此模块。公共入口为 `@libs/server-elasticsearch`。

## 接入

```ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { ElasticsearchModule } from '@libs/server-elasticsearch'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        () => ({
          elasticsearch: {
            host: 'localhost',
            port: 9200,
            apiKey: process.env['ELASTICSEARCH_API_KEY'],
            maxRetries: 3,
            requestTimeout: 3000,
            dataIndex: 'business-search'
          }
        })
      ]
    }),
    ElasticsearchModule.register()
  ]
})
export class SearchFeatureModule {}
```

在该模块的 provider 中注入同一入口导出的 `ElasticsearchService`，使用 SDK 的 search/index 等方法。索引名称和数据同步由业务负责，模块不自动建索引。当前沿用 host/port 的 HTTP 接入；如接托管 TLS 集群，应先扩展连接配置并测其契约，不要把 HTTPS URL 填进 host。

## 验证

`pnpm nx run-many -t lint,typecheck,test -p server-elasticsearch`。测试验证 Nest 注册和 SDK 参数；不向 Elasticsearch 发请求，真实搜索另用隔离服务测试。
