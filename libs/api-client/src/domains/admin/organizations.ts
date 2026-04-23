import type {
  GetInvitationsReq,
  GetInvitationsRes,
  GetMembersReq,
  GetMembersRes,
  GetOrganizationRes,
  GetOrganizationsReq,
  GetOrganizationsRes
} from '@libs/payload'

import { createMutationFactory, createQueryOptionsWithParams } from '../../lib/queries/factory'

function serializeSort(sort?: { id: string; desc?: boolean }[]) {
  return sort?.length ? encodeURIComponent(JSON.stringify(sort)) : undefined
}

function serializeQueryParams<T extends object | undefined>(params: T) {
  if (!params) {
    return params
  }

  const rawParams = params as Record<string, unknown>

  return {
    ...rawParams,
    sort: Array.isArray(rawParams['sort'])
      ? serializeSort(rawParams['sort'] as { id: string; desc?: boolean }[])
      : rawParams['sort']
  }
}

// ==================== Keys ====================

export const adminOrgKeys = {
  all: ['admin', 'organizations'] as const,
  lists: () => [...adminOrgKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...adminOrgKeys.lists(), params] as const,
  details: () => [...adminOrgKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminOrgKeys.details(), id] as const,
  members: (id: string) => [...adminOrgKeys.detail(id), 'members'] as const,
  invitations: (id: string) => [...adminOrgKeys.detail(id), 'invitations'] as const
} as const

export type AdminOrgKeys = typeof adminOrgKeys

// ==================== Queries ====================

export const adminOrgQueries = {
  list: createQueryOptionsWithParams<GetOrganizationsRes, Error, GetOrganizationsRes, GetOrganizationsReq | undefined>(
    (api, params) => ({
      queryKey: adminOrgKeys.list(params ? ({ ...params } as Record<string, unknown>) : undefined),
      queryFn: () => api.get('/admin/organizations', { params: serializeQueryParams(params) })
    })
  ),

  detail: createQueryOptionsWithParams<GetOrganizationRes, Error, GetOrganizationRes, { id: string }>(
    (api, { id }) => ({
      queryKey: adminOrgKeys.detail(id),
      queryFn: () => api.get(`/admin/organizations/${id}`)
    })
  ),

  members: createQueryOptionsWithParams<GetMembersRes, Error, GetMembersRes, { id: string } & GetMembersReq>(
    (api, { id, ...params }) => ({
      queryKey: adminOrgKeys.members(id),
      queryFn: () => api.get(`/admin/organizations/${id}/members`, { params: serializeQueryParams(params) })
    })
  ),

  invitations: createQueryOptionsWithParams<
    GetInvitationsRes,
    Error,
    GetInvitationsRes,
    { id: string } & GetInvitationsReq
  >((api, { id, ...params }) => ({
    queryKey: adminOrgKeys.invitations(id),
    queryFn: () => api.get(`/admin/organizations/${id}/invitations`, { params: serializeQueryParams(params) })
  }))
}

// ==================== Mutations ====================

export const adminOrgMutations = {
  update: createMutationFactory<NonNullable<GetOrganizationRes>, Error, { id: string; name?: string; slug?: string }>(
    (api, { id, ...data }) => api.patch(`/admin/organizations/${id}`, data)
  ),

  delete: createMutationFactory<void, Error, { id: string }>((api, { id }) => api.delete(`/admin/organizations/${id}`)),

  updateMember: createMutationFactory<
    GetMembersRes['list'][number],
    Error,
    { orgId: string; memberId: string; role: string }
  >((api, { orgId, memberId, ...data }) => api.patch(`/admin/organizations/${orgId}/members/${memberId}`, data)),

  deleteMember: createMutationFactory<void, Error, { orgId: string; memberId: string }>((api, { orgId, memberId }) =>
    api.delete(`/admin/organizations/${orgId}/members/${memberId}`)
  ),

  deleteInvitation: createMutationFactory<void, Error, { orgId: string; invitationId: string }>(
    (api, { orgId, invitationId }) => api.delete(`/admin/organizations/${orgId}/invitations/${invitationId}`)
  )
}
