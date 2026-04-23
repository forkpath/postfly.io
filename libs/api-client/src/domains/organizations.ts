import type { ApiClient } from '../lib/client'
import type {
  GenerateOrganizationSlugReq,
  GenerateOrganizationSlugRes,
  GetInvitationsRes,
  GetMembersRes,
  IsOnlyOwnerRes
} from '@libs/payload'

import { createMutationFactory, createQueryOptionsWithParams } from '../lib/queries/factory'

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

export const orgRequests = {
  members: (api: ApiClient, params: { id: string } & Record<string, unknown>) => {
    const { id, ...query } = params
    return api.get<GetMembersRes>(`/organizations/${id}/members`, { params: query })
  },
  invitations: (api: ApiClient, params: { id: string } & Record<string, unknown>) => {
    const { id, ...query } = params
    return api.get<GetInvitationsRes>(`/organizations/${id}/invitations`, { params: query })
  },
  isOnlyOwner: (api: ApiClient, params: { id: string }) =>
    api.get<IsOnlyOwnerRes>(`/organizations/${params.id}/members/is-only-owner`),
  getSlug: (api: ApiClient, params: GenerateOrganizationSlugReq) =>
    api.get<GenerateOrganizationSlugRes>('/organizations/slug', { params })
}

export const orgQueries = {
  members: createQueryOptionsWithParams<GetMembersRes, Error, GetMembersRes, { id: string } & Record<string, unknown>>(
    (api, { id, ...params }) => ({
      queryKey: orgKeys.members(id, params),
      queryFn: () => api.get(`/organizations/${id}/members`, { params })
    })
  ),
  invitations: createQueryOptionsWithParams<
    GetInvitationsRes,
    Error,
    GetInvitationsRes,
    { id: string } & Record<string, unknown>
  >((api, { id, ...params }) => ({
    queryKey: orgKeys.invitations(id, params),
    queryFn: () => api.get(`/organizations/${id}/invitations`, { params })
  })),
  isOnlyOwner: createQueryOptionsWithParams<IsOnlyOwnerRes, Error, IsOnlyOwnerRes, { id: string }>((api, { id }) => ({
    queryKey: orgKeys.isOnlyOwner(id),
    queryFn: () => api.get(`/organizations/${id}/members/is-only-owner`)
  }))
}

export const orgMutations = {
  getSlug: createMutationFactory<GenerateOrganizationSlugRes, Error, GenerateOrganizationSlugReq>((api, params) =>
    orgRequests.getSlug(api, params)
  )
}
