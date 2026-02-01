import type { PaginatedUsersResponse, UserResponse, UserSessionResponse } from '../../../application/dtos/user/user.dto'

import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'

import { Roles, Session } from '@libs/srv-shared'

import { BanUserCommand } from '../../../application/commands/user/ban-user.command'
import { DeleteUserCommand } from '../../../application/commands/user/delete-user.command'
import {
  RevokeAllSessionsCommand,
  RevokeSessionCommand
} from '../../../application/commands/user/revoke-session.command'
import { SetUserPasswordCommand } from '../../../application/commands/user/set-password.command'
import { UnbanUserCommand } from '../../../application/commands/user/unban-user.command'
import { UpdateUserCommand } from '../../../application/commands/user/update-user.command'
import {
  BanUserDto,
  ListUsersQueryDto,
  RevokeSessionDto,
  SetUserPasswordDto,
  UpdateUserDto
} from '../../../application/dtos/user/user.dto'
import { GetUserSessionsQuery } from '../../../application/queries/user/get-user-sessions.query'
import { GetUserQuery } from '../../../application/queries/user/get-user.query'
import { ListUsersQuery } from '../../../application/queries/user/list-users.query'

/**
 * 会话类型（来自 @libs/srv-shared AuthGuard）
 */
interface SessionUser {
  id: string
  email: string
  name: string
  role?: string
}

interface AuthSession {
  user: SessionUser
}

/**
 * 用户管理控制器
 *
 * 提供管理员用户管理接口
 */
@Controller('admin/users')
@Roles(['admin'])
export class UserController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus
  ) {}

  /**
   * 获取用户列表
   */
  @Get()
  async list(@Query() query: ListUsersQueryDto): Promise<PaginatedUsersResponse> {
    return this.queryBus.execute(new ListUsersQuery(query))
  }

  /**
   * 获取单个用户
   */
  @Get(':id')
  async get(@Param('id') id: string): Promise<UserResponse> {
    return this.queryBus.execute(new GetUserQuery(id))
  }

  /**
   * 更新用户
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserResponse> {
    return this.commandBus.execute(new UpdateUserCommand(id, dto))
  }

  /**
   * 删除用户
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Session() session: AuthSession): Promise<void> {
    return this.commandBus.execute(new DeleteUserCommand(id, session.user.id))
  }

  /**
   * 封禁用户
   */
  @Post(':id/ban')
  async ban(@Param('id') id: string, @Session() session: AuthSession, @Body() dto: BanUserDto): Promise<UserResponse> {
    return this.commandBus.execute(new BanUserCommand(id, session.user.id, dto.reason, dto.expiresAt))
  }

  /**
   * 解封用户
   */
  @Post(':id/unban')
  async unban(@Param('id') id: string): Promise<UserResponse> {
    return this.commandBus.execute(new UnbanUserCommand(id))
  }

  /**
   * 设置用户密码
   */
  @Post(':id/password')
  async setPassword(@Param('id') id: string, @Body() dto: SetUserPasswordDto): Promise<void> {
    return this.commandBus.execute(new SetUserPasswordCommand(id, dto.newPassword))
  }

  /**
   * 获取用户会话列表
   */
  @Get(':id/sessions')
  async getSessions(@Param('id') id: string): Promise<UserSessionResponse[]> {
    return this.queryBus.execute(new GetUserSessionsQuery(id))
  }

  /**
   * 撤销单个会话
   */
  @Delete(':id/sessions')
  async revokeSession(@Param('id') _id: string, @Body() dto: RevokeSessionDto): Promise<void> {
    return this.commandBus.execute(new RevokeSessionCommand(dto.token))
  }

  /**
   * 撤销用户所有会话
   */
  @Delete(':id/sessions/all')
  async revokeAllSessions(@Param('id') id: string): Promise<void> {
    return this.commandBus.execute(new RevokeAllSessionsCommand(id))
  }
}
