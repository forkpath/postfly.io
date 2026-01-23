# @libs/api-client

基于 `@libs/api-core` 和 TanStack Query 的业务 API 客户端库，提供跨端复用的接口调用能力和 React Hooks。

## 架构定位

```
┌─────────────────────────────────────────────────────────────┐
│                    业务组件 / 页面                            │
│              (apps/web, apps/desktop, libs/studio)          │
└─────────────────────────────┬───────────────────────────────┘
                              │ 依赖
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    @libs/api-client                         │
│     • React Query Hooks                                     │
│     • Query Options Factory                                 │
│     • Query Keys 管理                                        │
└─────────────────────────────┬───────────────────────────────┘
                              │ 依赖
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    @libs/api-core                           │
│     • Axios 实例创建                                         │
│     • 响应解包 / 错误处理                                      │
│     • 跨端适配（baseURL, adapter）                            │
└─────────────────────────────────────────────────────────────┘
```

**职责分离**：

- `api-core`：通信能力 + 跨端差异适配
- `api-client`：业务接口 + React Hooks

## 文件结构

libs/api-client/src/
├── index.ts # 公共导出
├── lib/
│ ├── client.ts # createClient 工厂（基于 api-core）
│ ├── context.tsx # ApiClientProvider + useApiClient
│ ├── query-client.ts # QueryClient 配置（SSR 友好）
│ ├── types.ts # 类型定义
│ ├── hooks/
│ │ ├── index.ts
│ │ ├── use-query-with-client.ts # 自动注入 api 的 useQuery
│ │ └── use-mutation-with-client.ts
│ └── queries/
│ ├── index.ts
│ ├── keys.ts # Query Keys 工厂
│ └── options.ts # Query Options 工厂（支持 SSR）

## 安装

```typescript
import { ApiClientProvider, useApiClient, useQueryWithClient } from '@libs/api-client'
```

## 快速开始

### 1. 配置 Provider

```tsx
// apps/web/src/app/__root.tsx
import { QueryClientProvider } from '@tanstack/react-query'

import { ApiClientProvider, getQueryClient } from '@libs/api-client'

function App({ children }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientProvider>{children}</ApiClientProvider>
    </QueryClientProvider>
  )
}
```

### 2. 使用 Hooks

```tsx
import { useMutationWithClient, useQueryWithClient, userKeys } from '@libs/api-client'

function UserProfile() {
  // Query - queryFn 接收包含 api, signal, queryKey 的 context
  const { data, isLoading } = useQueryWithClient({
    queryKey: userKeys.profile(),
    queryFn: ({ api }) => api.get('/users/profile')
  })

  // 支持请求取消
  const { data: user } = useQueryWithClient({
    queryKey: ['user', userId],
    queryFn: ({ api, signal }) => api.get(`/users/${userId}`, { signal })
  })

  // Mutation
  const updateProfile = useMutationWithClient({
    mutationFn: (api, data) => api.put('/users/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() })
    }
  })

  if (isLoading) return <Loading />

  return (
    <div>
      <h1>{data.name}</h1>
      <button onClick={() => updateProfile.mutate({ name: 'New Name' })}>Update</button>
    </div>
  )
}
```

## API 参考

### Client 创建

#### `createClient(options?: ApiClientOptions)`

创建 Axios 实例。自动检测运行时环境并配置相应的 baseURL。

```typescript
interface ApiClientOptions {
  baseURL?: string // API 基础路径
  runtime?: 'web' | 'desktop' | 'ssr'
  timeout?: number // 默认 30000
  withCredentials?: boolean // 默认 true
  authBasePath?: string // 默认 '/api/auth'，用于跳过 wrap
  adapter?: AxiosAdapter // 自定义适配器
  headers?: Record<string, string>
  auth?: {
    getAccessToken?: () => string | undefined | Promise<string | undefined>
    headerName?: string
    alwaysSetHeader?: boolean
    format?: (token: string) => string
  }
}
```

**运行时默认 baseURL**：
| Runtime | 默认值 |
|---------|--------|
| `web` | `''`（使用 vite proxy） |
| `ssr` | `process.env.API_BASE_URL` |
| `desktop` | `process.env.VITE_API_BASE_URL` |

**鉴权示例**：

```typescript
const api = createClient({
  auth: {
    getAccessToken: () => localStorage.getItem('token'),
    headerName: 'X-Auth-Token',
    format: token => `Token ${token}`
  }
})
```

### Context & Hooks

#### `ApiClientProvider`

提供 API 客户端上下文。

**注意**：`options` 仅在首次渲染时生效，后续变化会被忽略以避免重建 client 和拦截器重复注册。如需动态配置，请传入新的 `client` 实例。

```tsx
<ApiClientProvider
  options={{ baseURL: '/api' }} // 仅首次生效
  client={preCreatedClient} // 可选：传入预创建的实例（支持动态变化）
  runtime="ssr" // 可选：显式指定运行时
>
  {children}
</ApiClientProvider>
```

#### `useApiClient()`

获取 Axios 实例。

```tsx
const api = useApiClient()
const data = await api.get('/users')
```

#### `useApiRuntime()`

获取当前运行时环境。

```tsx
const runtime = useApiRuntime() // 'web' | 'desktop' | 'ssr'
```

### Query Client

#### `getQueryClient(options?: QueryClientOptions)`

获取 QueryClient 实例（单例模式）。

```typescript
interface QueryClientOptions {
  staleTime?: number // 默认 60000
  gcTime?: number // 默认 300000
  // Query 错误处理，可通过 query.queryKey/meta 过滤
  onQueryError?: (error: unknown, context: { query }) => void
  // Mutation 错误处理
  onMutationError?: (error: unknown, context: { mutation; variables }) => void
}
```

#### `getErrorMessage(error: unknown)`

从错误对象提取用户友好的消息。

```typescript
try {
  await api.post('/users')
} catch (error) {
  toast.error(getErrorMessage(error))
}
```

### Query Utilities

按 domain 组织的 Query Keys 和工具函数。

#### Domain Keys

每个业务领域有独立的 keys 文件：

```typescript
// 用户相关
// ['users', 'detail', '123']

// 组织相关
import { orgKeys, userKeys } from '@libs/api-client'

userKeys.all // ['users']
userKeys.profile() // ['users', 'profile']
userKeys.detail('123')

orgKeys.all // ['organizations']
orgKeys.detail('org-1') // ['organizations', 'detail', 'org-1']
orgKeys.members('org-1') // ['organizations', 'detail', 'org-1', 'members']

// 批量失效
queryClient.invalidateQueries({ queryKey: userKeys.all })
```

#### `createKeys`

创建自定义领域的 Key 工厂：

```typescript
import { createKeys } from '@libs/api-client'

// 在 queries/projects.ts 中
export const projectKeys = createKeys('projects')

projectKeys.all // ['projects']
projectKeys.detail('456') // ['projects', 'detail', '456']
```

**迁移提示**：如果旧代码还在使用 `queryKeys.*`，建议按 domain 拆分为 `userKeys/orgKeys/...`，并逐步替换调用处。`queryKeys` 仍保留但视为 deprecated。

#### `createQueryOptionsFactory`

创建可复用的 Query Options（支持 SSR）。

```typescript
// 在 queries/users.ts 中定义
export const userProfileOptions = createQueryOptionsFactory(api => ({
  queryKey: userKeys.profile(),
  queryFn: () => api.get<User>('/users/profile')
}))

// 在组件中使用
const api = useApiClient()
const { data } = useQuery(userProfileOptions(api))

// 在 SSR loader 中使用
export const loader = async () => {
  const api = createClient({ runtime: 'ssr' })
  return queryClient.fetchQuery(userProfileOptions(api))
}
```

#### `createQueryOptionsWithParams`

带参数的 Query Options 工厂。

```typescript
export const userDetailOptions = createQueryOptionsWithParams<User, Error, User, { userId: string }>(
  (api, { userId }) => ({
    queryKey: userKeys.detail(userId),
    queryFn: () => api.get<User>(`/users/${userId}`)
  })
)

// 使用
const { data } = useQuery(userDetailOptions(api, { userId: '123' }))
```

#### `createMutationFactory`

创建 Mutation 工厂（增删改操作）。

```typescript
// 定义 mutation
export const createUserMutation = createMutationFactory<User, Error, CreateUserInput>((api, data) =>
  api.post('/users', data)
)

// 在组件中使用
const api = useApiClient()
const mutation = useMutation(
  createUserMutation.options(api, {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all })
  })
)

// 调用
mutation.mutate({ email: 'test@example.com', name: 'Test' })
```

#### `createMutationWithParamsFactory`

带额外参数的 Mutation 工厂（用于需要上下文参数的场景，如 orgId）。

```typescript
// 定义 mutation（需要 orgId 参数）
export const inviteMemberMutation = createMutationWithParamsFactory<Invitation, Error, InviteInput, { orgId: string }>(
  (api, data, { orgId }) => api.post(`/organizations/${orgId}/invitations`, data)
)

// 使用时传入 orgId
const mutation = useMutation(
  inviteMemberMutation.options(
    api,
    { orgId },
    {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) })
    }
  )
)
```

### Wrapped Hooks

#### `useQueryWithClient`

自动注入 API 客户端的 useQuery。queryFn 接收完整的 context（包含 `api`、`signal`、`queryKey`、`meta`）。

```tsx
// 基础用法
const { data } = useQueryWithClient({
  queryKey: ['users'],
  queryFn: ({ api }) => api.get('/users')
})

// 使用 signal 支持请求取消
const { data } = useQueryWithClient({
  queryKey: ['user', userId],
  queryFn: ({ api, signal }) => api.get(`/users/${userId}`, { signal })
})

// 从 queryKey 获取参数
const { data } = useQueryWithClient({
  queryKey: ['user', userId] as const,
  queryFn: ({ api, queryKey }) => {
    const [, id] = queryKey
    return api.get(`/users/${id}`)
  }
})
```

#### `useMutationWithClient`

自动注入 API 客户端的 useMutation。

```tsx
const mutation = useMutationWithClient({
  mutationFn: (api, data) => api.post('/users', data)
})
```

## SSR 集成

### TanStack Start

```tsx
// routes/users.tsx
import { createFileRoute } from '@tanstack/react-router'

import { createClient, userProfileOptions } from '@libs/api-client'

export const Route = createFileRoute('/users')({
  loader: async ({ context }) => {
    const api = createClient({ runtime: 'ssr' })
    return context.queryClient.ensureQueryData(userProfileOptions(api))
  },
  component: UsersPage
})
```

## Desktop 集成

```tsx
// apps/desktop/src/renderer/main.tsx
import { ApiClientProvider } from '@libs/api-client'

function App() {
  return (
    <ApiClientProvider
      options={{
        runtime: 'desktop',
        baseURL: 'http://localhost:8000'
      }}
    >
      <Router />
    </ApiClientProvider>
  )
}
```

## 类型导出

```typescript
export type {
  ApiClientOptions,
  ApiClientContextValue,
  ApiRuntime,
  ApiClientProviderProps,
  QueryClientOptions,
  KeyFactory,
  UserKeys,
  OrgKeys
}
```

## 目录结构

```
queries/
├── index.ts           # 统一导出
├── factory.ts         # Query/Mutation 工厂函数
├── create-keys.ts     # createKeys 工具函数
├── users.ts           # 用户相关 keys + queries + mutations
├── organizations.ts   # 组织相关 keys + queries + mutations
└── [domain].ts        # 其他业务领域...
```

## 最佳实践

### 1. 按 Domain 组织 CRUD

每个业务领域一个文件，包含 keys、queries 和 mutations：

```typescript
// libs/api-client/src/lib/queries/users.ts
import { createMutationFactory, createQueryOptionsFactory, createQueryOptionsWithParams } from './factory'

// ========== Keys ==========
export const userKeys = {
  all: ['users'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  list: (filters?: Record<string, unknown>) => [...userKeys.all, 'list', filters] as const
}

// ========== Queries（查） ==========
export const userQueries = {
  profile: createQueryOptionsFactory<User>(api => ({
    queryKey: userKeys.profile(),
    queryFn: () => api.get('/users/profile')
  })),

  detail: createQueryOptionsWithParams<User, Error, User, { id: string }>((api, { id }) => ({
    queryKey: userKeys.detail(id),
    queryFn: () => api.get(`/users/${id}`)
  })),

  list: createQueryOptionsWithParams<User[], Error, User[], { filters?: Record<string, unknown> }>(
    (api, { filters }) => ({
      queryKey: userKeys.list(filters),
      queryFn: () => api.get('/users', { params: filters })
    })
  )
}

// ========== Mutations（增删改） ==========
export const userMutations = {
  create: createMutationFactory<User, Error, CreateUserInput>((api, data) => api.post('/users', data)),

  update: createMutationFactory<User, Error, UpdateUserInput>((api, data) => api.patch('/users/profile', data)),

  delete: createMutationFactory<void, Error, { id: string }>((api, { id }) => api.delete(`/users/${id}`))
}
```

### 2. 在组件中使用

```tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useApiClient, userKeys, userMutations, userQueries } from '@libs/api-client'

function UserProfile() {
  const api = useApiClient()
  const queryClient = useQueryClient()

  // 查询
  const { data: user, isLoading } = useQuery(userQueries.profile(api))

  // 更新
  const updateMutation = useMutation(
    userMutations.update.options(api, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: userKeys.profile() })
      }
    })
  )

  // 删除
  const deleteMutation = useMutation(
    userMutations.delete.options(api, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: userKeys.all })
      }
    })
  )

  if (isLoading) return <Loading />

  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={() => updateMutation.mutate({ name: 'New Name' })}>更新</button>
      <button onClick={() => deleteMutation.mutate({ id: user.id })}>删除</button>
    </div>
  )
}
```

### 3. 统一错误处理

```tsx
// 在 QueryClientProvider 配置全局错误处理（通过 QueryCache/MutationCache 实现）
const queryClient = getQueryClient({
  onQueryError: (error, { query }) => {
    // 可根据 queryKey 或 meta 过滤
    if (query.meta?.suppressError) return

    console.error('Query failed:', query.queryKey, error)
  },
  onMutationError: (error, { mutation }) => {
    // 所有 mutation 失败时触发
    toast.error(getErrorMessage(error))
  }
})
```

### 4. 利用 Query Key 失效策略

```typescript
// 精确失效
queryClient.invalidateQueries({ queryKey: userKeys.profile() })

// 批量失效（所有 user 相关）
queryClient.invalidateQueries({ queryKey: userKeys.all })

// 在 mutation 成功后失效
const mutation = useMutation(
  userMutations.update.options(api, {
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: userKeys.profile() })
    }
  })
)
```

### 5. 乐观更新（Optimistic Updates）

通过泛型参数 `TContext` 指定上下文类型，实现类型安全的乐观更新：

```typescript
interface OptimisticContext {
  previousProfile: User | undefined
}

const mutation = useMutation(
  // 通过 .options<TContext>() 指定上下文类型
  userMutations.update.options<OptimisticContext>(api, {
    onMutate: async newData => {
      // 取消进行中的查询
      await queryClient.cancelQueries({ queryKey: userKeys.profile() })

      // 保存旧数据
      const previousProfile = queryClient.getQueryData<User>(userKeys.profile())

      // 乐观更新
      queryClient.setQueryData<User>(userKeys.profile(), old => (old ? { ...old, ...newData } : old))

      // 返回上下文（用于回滚）
      return { previousProfile }
    },
    onError: (err, variables, context) => {
      // context 类型为 OptimisticContext | undefined
      if (context?.previousProfile) {
        queryClient.setQueryData(userKeys.profile(), context.previousProfile)
      }
    },
    onSettled: () => {
      // 无论成功失败，重新获取最新数据
      queryClient.invalidateQueries({ queryKey: userKeys.profile() })
    }
  })
)
```

### 6. 嵌套资源的 Mutation

对于需要父级 ID 的操作（如组织成员），使用 `createMutationWithParamsFactory`：

```typescript
// 定义
export const orgMutations = {
  inviteMember: createMutationWithParamsFactory<Invitation, Error, InviteInput, { orgId: string }>(
    (api, data, { orgId }) => api.post(`/organizations/${orgId}/invitations`, data)
  )
}

// 使用
const orgId = 'org-123'
const inviteMutation = useMutation(
  orgMutations.inviteMember.options(
    api,
    { orgId },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) })
        queryClient.invalidateQueries({ queryKey: orgKeys.invitations(orgId) })
      }
    }
  )
)

inviteMutation.mutate({ email: 'user@example.com', role: 'member' })
```

### 7. `use-query-with-client` / `use-mutation-with-client` 的价值

**作用：** 在组件里“直接用、少样板”，自动注入 Axios client，避免每个组件都写 const api = useApiClient() + 手动传入。

```
// ✅ Domain Queries - 会被多处复用的标准接口
const { data } = useQuery(userQueries.profile(api))

// ✅ Wrapped Hooks - 某个页面独有的一次性查询，不值得抽取
const { data } = useQueryWithClient({
  queryKey: ['dashboard', 'stats', timeRange],
  queryFn: ({ api, signal }) => api.get('/dashboard/stats', {
    params: { range: timeRange },
    signal  // 支持取消
  })
})
```

**适用场景：**

- 小组件/局部请求：只在一个组件里用一次，不想单独建 `domain query/mutation`
- 临时或页面级逻辑：试验、原型、页面内的快速迭代
- 你不想强制走 domain 目录时：比如非业务核心、一次性请求

**什么时候不优先用：**

- 可复用的业务逻辑 → 更适合放到 queries/ 的 domain 文件中，便于复用、统一缓存策略与 key 管理。
