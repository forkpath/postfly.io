# server-storage

## 用途

可选 S3/OSS 统一对象存储适配，提供读写、分页、批量删除、策略等；不注册 HTTP 路由。

## Tags、使用者与场景

`type:platform` · `runtime:node` · `domain:platform`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

Node Nest 业务模块或直接 createStorageProvider 的 Node 调用方；Engine HTTP 存储接口是另一层。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

通过 ConfigService.storage 或 createStorageProvider(config) 注入，必须明确 provider=aws-s3/aliyun-oss。没有自动读取 STORAGE_PROVIDER 的机制；该字段需宿主组装。旧示例用 STORAGE_ENDPOINT，server-nest 实际读 STORAGE_END_POINT，二者不是自动别名。

| 变量                                                  | 含义                                                 | 何时配置/默认       | 值从哪里来                              |
| ----------------------------------------------------- | ---------------------------------------------------- | ------------------- | --------------------------------------- |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_ACCESS_KEY_SECRET` | 对象存储账号凭据                                     | 启用存储时必填      | AWS IAM/阿里云 RAM 最小权限账号         |
| `STORAGE_BUCKET` / `STORAGE_REGION`                   | 存储桶和区域                                         | 启用时配置          | 预先创建的 bucket                       |
| `STORAGE_END_POINT`                                   | server-nest/现有 Engine 存储配置读取的 endpoint 拼写 | S3 兼容服务按需配置 | 存储服务完整 endpoint；不是通用自动别名 |

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project server-storage --json
pnpm nx run server-storage:lint
pnpm nx run server-storage:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run server-storage:test --run
```

覆盖分页、批量删除部分失败、空/根前缀拒绝、厂商错误；S3/OSS 签名语义不同，真实云权限/回调另测。

现有用例示例：[src/storage.spec.ts](src/storage.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。

## 接入细节与厂商契约

公共入口 `@libs/server-storage`，保留通用对象存储能力。Engine 现有 HTTP 签名 URL 用例继续存在，本库不注册任何 HTTP 路由。

## 接入

```ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { StorageModule } from '@libs/server-storage'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        () => ({
          storage: {
            provider: 'aws-s3', // 或 aliyun-oss，必须显式选择
            accessKeyId: process.env['STORAGE_ACCESS_KEY_ID'],
            accessKeySecret: process.env['STORAGE_ACCESS_KEY_SECRET'],
            region: process.env['STORAGE_REGION'],
            bucket: process.env['STORAGE_BUCKET'],
            endpoint: process.env['STORAGE_ENDPOINT']
          }
        })
      ]
    }),
    StorageModule.register()
  ]
})
export class FilesModule {}
```

业务 provider 注入 `StorageService`，可调用 putObject/getObject/copyObject/deleteObject/deleteObjects/listObjects/deleteDir/getObjectUrl/getPolicy。也可以不用 Nest，调用导出的 `createStorageProvider(config)` 创建适配器。

## 契约差异

- 原旧库隐式使用 OSS；此处必须明确 provider，禁止猜测。
- listObjects 读取所有页；数据量很大时后续可扩展游标接口。
- S3 批量删除按 1000 条分批，部分错误会抛出；失败前的批次可能已经完成，操作并非事务。
- deleteDir 是真实删除，拒绝空/根前缀，但业务仍必须校验用户/组织权限以及完整前缀边界。
- getPolicy 在 OSS 返回表单策略，S3 返回预签名 PUT URL（放在 policy 字段）；调用者需按 provider 选上传方式。S3 不支持 OSS HTTP callback。
- putObject 的可选 options 沿用 OSS 类型；S3 不消费 OSS 专用选项。getObjectUrl 沿用旧语义：S3 签名读取 URL，OSS 对象 URL，其访问仍由 bucket 策略决定。

## 验证

`pnpm nx run-many -t lint,typecheck,test -p server-storage`。Mock 测试覆盖分页、批量删除、部分失败、OSS 错误传播与空前缀拒绝；真实签名、网络读写与厂商权限需单独 sandbox 集成测试。
