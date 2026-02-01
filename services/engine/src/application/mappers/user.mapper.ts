import type { UserEntity, UserSessionEntity } from '../../domain/entities/user.entity'
import type { UserResponse, UserSessionResponse } from '../dtos/user/user.dto'

/**
 * 用户实体映射器
 *
 * 负责 Domain Entity 与 Application DTO 之间的转换
 */
export class UserMapper {
  /**
   * 将领域实体转换为响应 DTO
   */
  static toResponse(entity: UserEntity): UserResponse {
    return {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      emailVerified: entity.emailVerified,
      image: entity.image,
      role: entity.role,
      banned: entity.banned,
      banReason: entity.banReason,
      banExpires: entity.banExpires,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    }
  }

  /**
   * 批量转换
   */
  static toResponseList(entities: UserEntity[]): UserResponse[] {
    return entities.map(e => this.toResponse(e))
  }

  /**
   * 将会话实体转换为响应 DTO
   */
  static sessionToResponse(entity: UserSessionEntity): UserSessionResponse {
    return {
      id: entity.id,
      userId: entity.userId,
      token: entity.token,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      ipAddress: entity.ipAddress,
      userAgent: entity.userAgent
    }
  }

  /**
   * 批量转换会话
   */
  static sessionsToResponse(entities: UserSessionEntity[]): UserSessionResponse[] {
    return entities.map(e => this.sessionToResponse(e))
  }
}
