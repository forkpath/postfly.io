import type { GetInvitationsRes, GetMembersRes, GetOrganizationRes, GetOrganizationsRes } from '@libs/payload'

import { createMutationFactory, createQueryOptionsWithParams } from '../../lib/queries/factory'

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
  list: createQueryOptionsWithParams<
    GetOrganizationsRes,
    Error,
    GetOrganizationsRes,
    Record<string, unknown> | undefined
  >((api, params) => ({
    queryKey: adminOrgKeys.list(params),
    queryFn: () => api.get('/admin/organizations', { params })
  })),

  detail: createQueryOptionsWithParams<GetOrganizationRes, Error, GetOrganizationRes, { id: string }>(
    (api, { id }) => ({
      queryKey: adminOrgKeys.detail(id),
      queryFn: () => api.get(`/admin/organizations/${id}`)
    })
  ),

  members: createQueryOptionsWithParams<GetMembersRes, Error, GetMembersRes, { id: string } & Record<string, unknown>>(
    (api, { id, ...params }) => ({
      queryKey: adminOrgKeys.members(id),
      queryFn: () => api.get(`/admin/organizations/${id}/members`, { params })
    })
  ),

  invitations: createQueryOptionsWithParams<
    GetInvitationsRes,
    Error,
    GetInvitationsRes,
    { id: string } & Record<string, unknown>
  >((api, { id, ...params }) => ({
    queryKey: adminOrgKeys.invitations(id),
    queryFn: () => api.get(`/admin/organizations/${id}/invitations`, { params })
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
