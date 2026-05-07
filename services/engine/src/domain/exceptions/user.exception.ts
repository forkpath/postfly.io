import type { DomainHttpStatus } from './domain.exception'

import { DomainException } from './domain.exception'

export abstract class UserDomainException extends DomainException {
  abstract readonly code: string
  abstract readonly i18nKey: string
  abstract readonly httpStatus: DomainHttpStatus
}

/**
 * 用户未找到异常
 */
export class UserNotFoundException extends UserDomainException {
  readonly code = 'USER_NOT_FOUND'
  readonly i18nKey = 'user.error.userNotFound'
  readonly httpStatus = 404

  constructor(userId: string) {
    super(`User with id ${userId} not found`, { userId })
  }
}

/**
 * 不能操作自己异常
 */
export class CannotOperateSelfException extends UserDomainException {
  readonly code = 'CANNOT_OPERATE_SELF'
  readonly i18nKey = 'user.error.cannotOperateSelf'
  readonly httpStatus = 400

  constructor(operation: string) {
    super(`You cannot ${operation} yourself`, { operation })
  }
}

/**
 * 用户已被封禁异常
 */
export class UserAlreadyBannedException extends UserDomainException {
  readonly code = 'USER_ALREADY_BANNED'
  readonly i18nKey = 'user.error.userAlreadyBanned'
  readonly httpStatus = 409

  constructor(userId: string) {
    super(`User ${userId} is already banned`, { userId })
  }
}

/**
 * 用户未被封禁异常
 */
export class UserNotBannedException extends UserDomainException {
  readonly code = 'USER_NOT_BANNED'
  readonly i18nKey = 'user.error.userNotBanned'
  readonly httpStatus = 409

  constructor(userId: string) {
    super(`User ${userId} is not banned`, { userId })
  }
}

/**
 * 无效用户角色异常
 */
export class InvalidUserRoleException extends UserDomainException {
  readonly code = 'INVALID_USER_ROLE'
  readonly i18nKey = 'user.error.invalidUserRole'
  readonly httpStatus = 400

  constructor(role: string) {
    super(`Invalid user role: ${role}`, { role })
  }
}

/**
 * 账户未找到异常
 */
export class AccountNotFoundException extends UserDomainException {
  readonly code = 'ACCOUNT_NOT_FOUND'
  readonly i18nKey = 'user.error.accountNotFound'
  readonly httpStatus = 404

  constructor(accountId: string) {
    super(`Account with id ${accountId} not found`, { accountId })
  }
}

/**
 * 不能删除最后一个认证方式
 */
export class LastAccountCannotBeDeletedException extends UserDomainException {
  readonly code = 'LAST_ACCOUNT_CANNOT_BE_DELETED'
  readonly i18nKey = 'user.error.lastAccountCannotBeDeleted'
  readonly httpStatus = 409

  constructor(userId: string) {
    super(`Cannot delete the last authentication method for user ${userId}`, { userId })
  }
}
