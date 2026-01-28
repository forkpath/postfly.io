import { mutationOptions, queryOptions } from '@tanstack/react-query'

import { appConfig } from '../../config/app'
import { pathsConfig } from '../../config/paths'
import { authClient } from '../../lib/auth/client'

const KEY = 'organizations'

const queries = {
  get: (params: { slug: string } | { id: string }) =>
    queryOptions({
      queryKey: [KEY, params],
      queryFn: () =>
        authClient.organization.getFullOrganization({
          query: 'id' in params ? { organizationId: params.id } : { organizationSlug: params.slug },
          fetchOptions: {
            throw: true
          }
        })
    })
}

const mutations = {
  setActive: mutationOptions({
    mutationKey: [KEY, 'active'],
    mutationFn: (params: Parameters<typeof authClient.organization.setActive>[0]) =>
      authClient.organization.setActive(params)
  }),
  create: mutationOptions({
    mutationKey: [KEY, 'create'],
    mutationFn: (params: Parameters<typeof authClient.organization.create>[0]) =>
      authClient.organization.create({
        ...params,
        fetchOptions: { throw: true }
      })
  }),
  update: mutationOptions({
    mutationKey: [KEY, 'update'],
    mutationFn: (params: Parameters<typeof authClient.organization.update>[0]) => authClient.organization.update(params)
  }),
  delete: mutationOptions({
    mutationKey: [KEY, 'delete'],
    mutationFn: (params: Parameters<typeof authClient.organization.delete>[0]) => authClient.organization.delete(params)
  }),
  leave: mutationOptions({
    mutationKey: [KEY, 'members', 'leave'],
    mutationFn: (params: Parameters<typeof authClient.organization.leave>[0]) => authClient.organization.leave(params)
  }),
  members: {
    remove: mutationOptions({
      mutationKey: [KEY, 'members', 'remove'],
      mutationFn: (params: Parameters<typeof authClient.organization.removeMember>[0]) =>
        authClient.organization.removeMember(params)
    }),
    invite: mutationOptions({
      mutationKey: [KEY, 'members', 'invite'],
      mutationFn: (params: Parameters<typeof authClient.organization.inviteMember>[0]) =>
        authClient.organization.inviteMember(params, {
          headers: {
            'x-url': new URL(pathsConfig.auth.join, appConfig.url).toString()
          }
        })
    }),
    updateRole: mutationOptions({
      mutationKey: [KEY, 'members', 'update-role'],
      mutationFn: (params: Parameters<typeof authClient.organization.updateMemberRole>[0]) =>
        authClient.organization.updateMemberRole(params)
    })
  },
  invitations: {
    accept: mutationOptions({
      mutationKey: [KEY, 'invitations', 'accept'],
      mutationFn: (params: Parameters<typeof authClient.organization.acceptInvitation>[0]) =>
        authClient.organization.acceptInvitation(params)
    }),
    reject: mutationOptions({
      mutationKey: [KEY, 'invitations', 'reject'],
      mutationFn: (params: Parameters<typeof authClient.organization.rejectInvitation>[0]) =>
        authClient.organization.rejectInvitation(params)
    }),
    cancel: mutationOptions({
      mutationKey: [KEY, 'invitations', 'cancel'],
      mutationFn: (params: Parameters<typeof authClient.organization.cancelInvitation>[0]) =>
        authClient.organization.cancelInvitation(params)
    })
  }
}

export const organization = {
  queries,
  mutations
} as const
