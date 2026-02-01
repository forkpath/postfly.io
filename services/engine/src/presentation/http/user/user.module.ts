import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'

import { BanUserHandler } from '../../../application/commands/user/ban-user.command'
import { DeleteUserHandler } from '../../../application/commands/user/delete-user.command'
import {
  RevokeAllSessionsHandler,
  RevokeSessionHandler
} from '../../../application/commands/user/revoke-session.command'
import { SetUserPasswordHandler } from '../../../application/commands/user/set-password.command'
import { UnbanUserHandler } from '../../../application/commands/user/unban-user.command'
import { UpdateUserHandler } from '../../../application/commands/user/update-user.command'
import { GetUserSessionsHandler } from '../../../application/queries/user/get-user-sessions.query'
import { GetUserHandler } from '../../../application/queries/user/get-user.query'
import { ListUsersHandler } from '../../../application/queries/user/list-users.query'
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface'
import { UserRepository } from '../../../infrastructure/repositories/user.repository'
import { UserController } from './user.controller'

/**
 * Query Handlers
 */
const QueryHandlers = [GetUserHandler, ListUsersHandler, GetUserSessionsHandler]

/**
 * Command Handlers
 */
const CommandHandlers = [
  UpdateUserHandler,
  BanUserHandler,
  UnbanUserHandler,
  DeleteUserHandler,
  RevokeSessionHandler,
  RevokeAllSessionsHandler,
  SetUserPasswordHandler
]

@Module({
  imports: [CqrsModule],
  controllers: [UserController],
  providers: [
    // Repository
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository
    },
    // Handlers
    ...QueryHandlers,
    ...CommandHandlers
  ],
  exports: [USER_REPOSITORY]
})
export class UserModule {}
