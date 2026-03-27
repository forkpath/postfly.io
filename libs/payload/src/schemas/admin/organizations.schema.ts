import { z } from 'zod'

import { InvitationStatus, MemberRole } from '../shared/constants'
import { offsetPaginationSchema } from '../shared/pagination.schema'
import { multiValueQuerySchema, rangeQuerySchema, sortQuerySchema } from '../shared/query-utils'

// ==================== Organizations List ====================

export const getOrganizationsReqSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  q: z.string().optional(),
  createdAt: rangeQuerySchema.optional(),
  members: rangeQuerySchema.optional()
})

export type GetOrganizationsReq = z.infer<typeof getOrganizationsReqSchema>

export const getOrganizationsResSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string().nullish(),
      logo: z.string().nullish(),
      createdAt: z.coerce.date(),
      members: z.number()
    })
  ),
  total: z.number(),
  max: z.object({
    members: z.number()
  })
})

export type GetOrganizationsRes = z.infer<typeof getOrganizationsResSchema>

// ==================== Organization Detail ====================

export const getOrganizationResSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    slug: z.string().nullish(),
    logo: z.string().nullish(),
    createdAt: z.coerce.date()
  })
  .nullable()

export type GetOrganizationRes = z.infer<typeof getOrganizationResSchema>

// ==================== Organization Members ====================

export const getMembersReqSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  q: z.string().optional(),
  role: multiValueQuerySchema(z.enum(MemberRole)).optional(),
  createdAt: rangeQuerySchema.optional()
})

export type GetMembersReq = z.infer<typeof getMembersReqSchema>

export const getMembersResSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      organizationId: z.string(),
      role: z.enum(MemberRole),
      createdAt: z.coerce.date(),
      userId: z.string(),
      user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        image: z.string().nullish()
      })
    })
  ),
  total: z.number()
})

export type GetMembersRes = z.infer<typeof getMembersResSchema>

// ==================== Organization Invitations ====================

export const getInvitationsReqSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  email: z.string().optional(),
  role: multiValueQuerySchema(z.enum(MemberRole)).optional(),
  status: multiValueQuerySchema(z.enum(InvitationStatus)).optional(),
  expiresAt: rangeQuerySchema.optional()
})

export type GetInvitationsReq = z.infer<typeof getInvitationsReqSchema>

export const getInvitationsResSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      organizationId: z.string(),
      email: z.string(),
      role: z.enum(MemberRole),
      expiresAt: z.coerce.date(),
      createdAt: z.coerce.date(),
      inviterId: z.string(),
      status: z.enum(InvitationStatus)
    })
  ),
  total: z.number()
})

export type GetInvitationsRes = z.infer<typeof getInvitationsResSchema>

// ==================== Mutations ====================

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional()
})

export type UpdateOrganizationPayload = z.infer<typeof updateOrganizationSchema>

export const updateMemberSchema = z.object({
  role: z.enum(MemberRole)
})

export type UpdateMemberPayload = z.infer<typeof updateMemberSchema>
