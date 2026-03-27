/**
 * 用户领域异常基类
 */
export abstract class UserDomainException extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * 用户未找到异常
 */
export class UserNotFoundException extends UserDomainException {
  constructor(userId: string) {
    super(`User with id ${userId} not found`, 'USER_NOT_FOUND')
  }
}

/**
 * 不能操作自己异常
 */
export class CannotOperateSelfException extends UserDomainException {
  constructor(operation: string) {
    super(`You cannot ${operation} yourself`, 'CANNOT_OPERATE_SELF')
  }
}

/**
 * 用户已被封禁异常
 */
export class UserAlreadyBannedException extends UserDomainException {
  constructor(userId: string) {
    super(`User ${userId} is already banned`, 'USER_ALREADY_BANNED')
  }
}

/**
 * 用户未被封禁异常
 */
export class UserNotBannedException extends UserDomainException {
  constructor(userId: string) {
    super(`User ${userId} is not banned`, 'USER_NOT_BANNED')
  }
}

/**
 * 无效用户角色异常
 */
export class InvalidUserRoleException extends UserDomainException {
  constructor(role: string) {
    super(`Invalid user role: ${role}`, 'INVALID_USER_ROLE')
  }
}

/**
 * 账户未找到异常
 */
export class AccountNotFoundException extends UserDomainException {
  constructor(accountId: string) {
    super(`Account with id ${accountId} not found`, 'ACCOUNT_NOT_FOUND')
  }
}

/**
 * 不能删除最后一个认证方式
 */
export class LastAccountCannotBeDeletedException extends UserDomainException {
  constructor(userId: string) {
    super(`Cannot delete the last authentication method for user ${userId}`, 'LAST_ACCOUNT_CANNOT_BE_DELETED')
  }
}
