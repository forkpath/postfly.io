/**
 * 创建标准化的 Query Key 工厂
 *
 * 遵循 TanStack Query 推荐的层级化 key 结构，便于精确/批量失效。
 *
 * @example
 * ```ts
 * // 创建 projects 领域的 keys
 * export const projectKeys = createKeys('projects')
 *
 * projectKeys.all              // ['projects']
 * projectKeys.lists()          // ['projects', 'list']
 * projectKeys.list({ page: 1 }) // ['projects', 'list', { page: 1 }]
 * projectKeys.detail('123')    // ['projects', 'detail', '123']
 *
 * // 批量失效
 * queryClient.invalidateQueries({ queryKey: projectKeys.all })
 * ```
 */
export function createKeys<T extends string>(scope: T) {
  return {
    /** 该领域的根 key，用于批量失效 */
    all: [scope] as const,

    /** 列表类 key 的前缀 */
    lists: () => [scope, 'list'] as const,

    /** 带过滤条件的列表 key */
    list: (filters?: Record<string, unknown>) => [scope, 'list', filters] as const,

    /** 详情类 key 的前缀 */
    details: () => [scope, 'detail'] as const,

    /** 单个实体的详情 key */
    detail: (id: string) => [scope, 'detail', id] as const
  } as const
}

export type KeyFactory = ReturnType<typeof createKeys>
