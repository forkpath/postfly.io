import { createZodDto } from 'nestjs-zod'

import {
  generateOrganizationSlugReqSchema,
  getInvitationsReqSchema,
  getMembersReqSchema,
  getOrganizationsReqSchema,
  updateMemberSchema,
  updateOrganizationSchema
} from '@libs/payload'

export class ListOrganizationsQueryDto extends createZodDto(getOrganizationsReqSchema) {}

export class ListMembersQueryDto extends createZodDto(getMembersReqSchema) {}

export class ListInvitationsQueryDto extends createZodDto(getInvitationsReqSchema) {}

export class GenerateOrganizationSlugQueryDto extends createZodDto(generateOrganizationSlugReqSchema) {}

export class UpdateOrganizationDto extends createZodDto(updateOrganizationSchema) {}

export class UpdateMemberDto extends createZodDto(updateMemberSchema) {}
