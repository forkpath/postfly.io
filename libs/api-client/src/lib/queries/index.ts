import { createKeys } from './create-keys'

// Factory utilities - Query
export { createQueryOptionsFactory, createQueryOptionsWithParams } from './factory'

// Factory utilities - Mutation
export { createMutationFactory, createMutationWithParamsFactory } from './factory'
export type { MutationOptionsWithoutFn } from './factory'

// Factory utilities - Keys
export { createKeys } from './create-keys'
export type { KeyFactory } from './create-keys'

// Domain: Users
export { userKeys } from '../../domains/users'
export type { UserKeys } from '../../domains/users'

// Domain: Organizations
export { orgKeys } from '../../domains/organizations'
export type { OrgKeys } from '../../domains/organizations'

// 向后兼容：聚合导出（deprecated，建议直接使用各 domain 的 keys）
/** @deprecated 请使用 userKeys, orgKeys 等具体的 domain keys */
export const queryKeys = {
  users: {
    all: ['users'] as const,
    lists: () => ['users', 'list'] as const,
    list: (filters?: Record<string, unknown>) => ['users', 'list', filters] as const,
    details: () => ['users', 'detail'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    profile: () => ['users', 'profile'] as const
  },
  organizations: {
    all: ['organizations'] as const,
    lists: () => ['organizations', 'list'] as const,
    list: (filters?: Record<string, unknown>) => ['organizations', 'list', filters] as const,
    details: () => ['organizations', 'detail'] as const,
    detail: (id: string) => ['organizations', 'detail', id] as const,
    members: (orgId: string) => ['organizations', 'detail', orgId, 'members'] as const,
    invitations: (orgId: string) => ['organizations', 'detail', orgId, 'invitations'] as const
  },
  create: createKeys
} as const
