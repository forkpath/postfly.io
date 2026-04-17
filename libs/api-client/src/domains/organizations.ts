/**
 * 组织域 React Query cache keys
 *
 * 说明：组织的读写大部分已走 Better Auth `authClient.organization.*`，只有少量带
 * 过滤条件的列表查询（members / invitations / is-only-owner）仍通过后端
 * `/organizations/*` 端点，因此这里只保留这些端点需要的 cache key 组合。
 */
export const orgKeys = {
  all: ['organizations'] as const,
  details: () => [...orgKeys.all, 'detail'] as const,
  detail: (id: string) => [...orgKeys.details(), id] as const,
  members: (orgId: string, params?: Record<string, unknown>) => [...orgKeys.detail(orgId), 'members', params] as const,
  invitations: (orgId: string, params?: Record<string, unknown>) =>
    [...orgKeys.detail(orgId), 'invitations', params] as const,
  isOnlyOwner: (orgId: string) => [...orgKeys.detail(orgId), 'is-only-owner'] as const
} as const

export type OrgKeys = typeof orgKeys
