import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'

import { DeleteInvitationHandler } from '../../../application/commands/organization/delete-invitation.command'
import { DeleteMemberHandler } from '../../../application/commands/organization/delete-member.command'
import { DeleteOrganizationHandler } from '../../../application/commands/organization/delete-organization.command'
import { UpdateMemberHandler } from '../../../application/commands/organization/update-member.command'
import { UpdateOrganizationHandler } from '../../../application/commands/organization/update-organization.command'
import { GetOrganizationHandler } from '../../../application/queries/organization/get-organization.query'
import { ListInvitationsHandler } from '../../../application/queries/organization/list-invitations.query'
import { ListMembersHandler } from '../../../application/queries/organization/list-members.query'
import { ListOrganizationsHandler } from '../../../application/queries/organization/list-organizations.query'
import { ORGANIZATION_REPOSITORY } from '../../../domain/repositories/organization.repository.interface'
import { OrganizationRepository } from '../../../infrastructure/repositories/organization.repository'
import { OrganizationController } from './organization.controller'

const QueryHandlers = [ListOrganizationsHandler, GetOrganizationHandler, ListMembersHandler, ListInvitationsHandler]

const CommandHandlers = [
  UpdateOrganizationHandler,
  DeleteOrganizationHandler,
  UpdateMemberHandler,
  DeleteMemberHandler,
  DeleteInvitationHandler
]

@Module({
  imports: [CqrsModule],
  controllers: [OrganizationController],
  providers: [
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: OrganizationRepository
    },
    ...QueryHandlers,
    ...CommandHandlers
  ],
  exports: [ORGANIZATION_REPOSITORY]
})
export class OrganizationModule {}
