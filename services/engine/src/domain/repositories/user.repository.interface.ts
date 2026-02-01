import type { PaginatedResult, UserEntity, UserListParams, UserSessionEntity } from '../entities/user.entity'

/**
 * 用户仓储接口
 *
 * 领域层定义的抽象接口，由基础设施层实现
 */
export interface IUserRepository {
  /**
   * 根据 ID 查找用户
   */
  findById(id: string): Promise<UserEntity | null>

  /**
   * 根据邮箱查找用户
   */
  findByEmail(email: string): Promise<UserEntity | null>

  /**
   * 获取用户列表（分页）
   */
  findMany(params: UserListParams): Promise<PaginatedResult<UserEntity>>

  /**
   * 更新用户信息
   */
  update(id: string, data: Partial<Pick<UserEntity, 'name' | 'image' | 'role'>>): Promise<UserEntity>

  /**
   * 封禁用户
   */
  ban(id: string, reason?: string, expiresAt?: Date): Promise<UserEntity>

  /**
   * 解封用户
   */
  unban(id: string): Promise<UserEntity>

  /**
   * 删除用户
   */
  delete(id: string): Promise<void>

  /**
   * 获取用户的所有会话
   */
  getSessions(userId: string): Promise<UserSessionEntity[]>

  /**
   * 撤销单个会话
   */
  revokeSession(sessionToken: string): Promise<void>

  /**
   * 撤销用户的所有会话
   */
  revokeAllSessions(userId: string): Promise<void>

  /**
   * 设置用户密码（管理员操作）
   */
  setPassword(userId: string, newPassword: string): Promise<void>
}

/**
 * 用户仓储注入 Token
 */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY')
