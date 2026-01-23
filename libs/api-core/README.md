# @libs/api-core

基于 Axios 封装的 API 客户端核心库，提供统一的请求/响应处理、鉴权注入和错误管理。

## 用途

该库用于创建标准化的 HTTP 客户端实例，主要解决以下问题：

1. **统一响应解包** - 自动处理后端 `{ code, msg, data }` 格式的响应，直接返回 `data` 部分
2. **鉴权 Header 注入** - 支持灵活配置 Token 获取和格式化逻辑
3. **错误统一处理** - 将网络错误和业务错误转换为类型化的错误对象
4. **跨端复用** - 支持 Web、Desktop、Mobile 等不同运行时环境

## 使用场景

- Web 前端（TanStack Start / React）
- Desktop 应用（Electron）
- 需要与后端 Engine 服务通信的任何客户端

## 安装

该库为 monorepo 内部库，通过路径别名引入：

```typescript
import { ApiError, ApiNetworkError, createApiClient } from '@libs/api-core'
```

## API 参考

### `createApiClient(options: ApiCoreOptions): AxiosInstance`

创建一个配置好拦截器的 Axios 实例。

#### ApiCoreOptions

| 参数              | 类型                     | 必填 | 默认值           | 说明                                 |
| ----------------- | ------------------------ | ---- | ---------------- | ------------------------------------ |
| `baseURL`         | `string`                 | ✅   | -                | API 基础路径                         |
| `timeout`         | `number`                 | ❌   | `30000`          | 请求超时时间（毫秒）                 |
| `withCredentials` | `boolean`                | ❌   | `true`           | 是否携带 Cookie（better-auth 需要）  |
| `adapter`         | `AxiosAdapter`           | ❌   | -                | 自定义 Axios 适配器                  |
| `headers`         | `Record<string, string>` | ❌   | -                | 额外请求头                           |
| `authBasePath`    | `string`                 | ❌   | `'/api/v1/auth'` | better-auth 路径前缀（跳过响应解包） |
| `auth`            | `AuthHeaderProvider`     | ❌   | -                | 鉴权配置                             |

#### AuthHeaderProvider

| 参数              | 类型                                        | 默认值            | 说明                          |
| ----------------- | ------------------------------------------- | ----------------- | ----------------------------- |
| `getAccessToken`  | `() => string \| undefined \| Promise<...>` | -                 | Token 获取函数                |
| `headerName`      | `string`                                    | `'Authorization'` | Header 名称                   |
| `alwaysSetHeader` | `boolean`                                   | `false`           | Token 为空时是否仍写入 Header |
| `format`          | `(token: string) => string`                 | `Bearer ${token}` | Token 格式化函数              |

### 错误类

#### `ApiError`

业务逻辑错误或 HTTP 错误响应。

```typescript
class ApiError extends Error {
  readonly code?: number // 业务错误码
  readonly status?: number // HTTP 状态码
  readonly data?: unknown // 完整响应体 { code, msg, data? }
  readonly response?: AxiosResponse
}
```

#### `ApiNetworkError`

网络层错误（无响应）。

```typescript
class ApiNetworkError extends Error {
  readonly cause?: unknown // 原始错误对象
}
```

### 请求配置扩展

可通过 `api` 字段控制单个请求的行为：

```typescript
interface ApiRequestConfig extends AxiosRequestConfig {
  api?: {
    skipWrap?: boolean // 跳过响应解包
    raw?: boolean // 返回原始 AxiosResponse
  }
}
```

## 使用示例

### 基础用法

```typescript
import { createApiClient } from '@libs/api-core'

const api = createApiClient({
  baseURL: '/api'
})

// 自动解包：后端返回 { code: 0, msg: 'ok', data: [...] }
// 这里直接得到 data 部分
const users = await api.get('/users')
```

### 配置鉴权

```typescript
const api = createApiClient({
  baseURL: '/api',
  auth: {
    getAccessToken: () => localStorage.getItem('token')
    // 或异步获取
    // getAccessToken: async () => await refreshTokenIfNeeded()
  }
})
```

### 自定义 Token 格式

```typescript
const api = createApiClient({
  baseURL: '/api',
  auth: {
    getAccessToken: () => getToken(),
    headerName: 'X-Auth-Token',
    format: token => `Token ${token}`
  }
})
```

### 适配器（adapter）示例

用于不同运行时（如 SSR/Node、测试环境）替换底层请求实现。

```typescript
import type { AxiosAdapter, AxiosResponse } from 'axios'

import { createApiClient } from '@libs/api-core'

const adapter: AxiosAdapter = async config => {
  const response: AxiosResponse = {
    data: { code: 0, msg: 'ok', data: { ok: true } },
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  }
  return response
}

const api = createApiClient({
  baseURL: '',
  adapter
})

const result = await api.get('/ping')
```

### 跳过响应解包

用于调用非标准格式的第三方接口：

```typescript
// 方式 1：单个请求跳过
const raw = await api.get('/external/api', {
  api: { skipWrap: true }
})

// 方式 2：获取完整 AxiosResponse
const response = await api.get('/users', {
  api: { raw: true }
})
console.log(response.headers, response.status)
```

### 错误处理

```typescript
import { ApiError, ApiNetworkError } from '@libs/api-core'

try {
  await api.post('/users', { name: 'test' })
} catch (error) {
  if (error instanceof ApiNetworkError) {
    // 网络错误（断网、超时等）
    console.error('网络异常:', error.message)
  } else if (error instanceof ApiError) {
    toast.error(e.message) // ← 这就是后端的 msg
    // 业务错误或 HTTP 错误
    if (error.code === 40001) {
      // 处理特定业务错误码
    }
    if (error.status === 401) {
      // 处理未授权
    }
  }
}
```

### 与 better-auth 配合

better-auth 的接口默认走 `/api/auth/*` 路径，会自动跳过响应解包：

```typescript
const api = createApiClient({
  baseURL: '',
  withCredentials: true, // better-auth 需要携带 cookie
  authBasePath: '/api/auth' // 默认值，可省略
})

// better-auth 接口会直接透传响应，不做解包
const session = await api.get('/api/auth/session')
```

## 响应处理逻辑

```
请求 → 响应拦截器
         │
         ├─ config.api.raw = true → 返回 AxiosResponse
         │
         ├─ URL 以 authBasePath 开头 或 config.api.skipWrap = true
         │   └→ 直接返回 response.data（不解包）
         │
         └─ 其他情况
             ├─ 非 WrappedResponse 格式 → 直接透传
             ├─ code === 0 → 返回 data 字段
             └─ code !== 0 → 抛出 ApiError
```

## 类型导出

```typescript
export { createApiClient, ApiError, ApiNetworkError }

export type { ApiCoreOptions, ApiRequestConfig, ApiRequestMeta, AuthHeaderProvider, WrappedResponse }
```
