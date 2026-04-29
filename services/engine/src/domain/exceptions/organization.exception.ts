import type { DomainHttpStatus } from './domain.exception'

import { DomainException } from './domain.exception'

export abstract class OrganizationDomainException extends DomainException {
  abstract readonly code: string
  abstract readonly i18nKey: string
  abstract readonly httpStatus: DomainHttpStatus
}

export class OrganizationNotFoundException extends OrganizationDomainException {
  readonly code = 'ORGANIZATION_NOT_FOUND'
  readonly i18nKey = 'organization.error.organizationNotFound'
  readonly httpStatus = 404

  constructor(id: string) {
    super(`Organization with id ${id} not found`, { id })
  }
}

export class OrganizationSlugConflictException extends OrganizationDomainException {
  readonly code = 'ORGANIZATION_SLUG_CONFLICT'
  readonly i18nKey = 'organization.error.organizationSlugConflict'
  readonly httpStatus = 409

  constructor(slug: string) {
    super(`Organization slug "${slug}" is already taken`, { slug })
  }
}

export class MemberNotFoundException extends OrganizationDomainException {
  readonly code = 'MEMBER_NOT_FOUND'
  readonly i18nKey = 'organization.error.memberNotFound'
  readonly httpStatus = 404

  constructor(memberId: string) {
    super(`Member with id ${memberId} not found`, { memberId })
  }
}

export class CannotRemoveOwnerException extends OrganizationDomainException {
  readonly code = 'CANNOT_REMOVE_OWNER'
  readonly i18nKey = 'organization.error.cannotRemoveOwner'
  readonly httpStatus = 409

  constructor() {
    super('Cannot remove the organization owner')
  }
}

export class CannotRemoveLastAdminException extends OrganizationDomainException {
  readonly code = 'CANNOT_REMOVE_LAST_ADMIN'
  readonly i18nKey = 'organization.error.cannotRemoveLastAdmin'
  readonly httpStatus = 409

  constructor() {
    super('Cannot remove the last admin of the organization')
  }
}

export class InvitationNotFoundException extends OrganizationDomainException {
  readonly code = 'INVITATION_NOT_FOUND'
  readonly i18nKey = 'organization.error.invitationNotFound'
  readonly httpStatus = 404

  constructor(invitationId: string) {
    super(`Invitation with id ${invitationId} not found`, { invitationId })
  }
}
