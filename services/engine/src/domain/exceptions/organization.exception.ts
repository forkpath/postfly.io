export abstract class OrganizationDomainException extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class OrganizationNotFoundException extends OrganizationDomainException {
  constructor(id: string) {
    super(`Organization with id ${id} not found`, 'ORGANIZATION_NOT_FOUND')
  }
}

export class OrganizationSlugConflictException extends OrganizationDomainException {
  constructor(slug: string) {
    super(`Organization slug "${slug}" is already taken`, 'ORGANIZATION_SLUG_CONFLICT')
  }
}

export class MemberNotFoundException extends OrganizationDomainException {
  constructor(memberId: string) {
    super(`Member with id ${memberId} not found`, 'MEMBER_NOT_FOUND')
  }
}

export class CannotRemoveOwnerException extends OrganizationDomainException {
  constructor() {
    super('Cannot remove the organization owner', 'CANNOT_REMOVE_OWNER')
  }
}

export class CannotRemoveLastAdminException extends OrganizationDomainException {
  constructor() {
    super('Cannot remove the last admin of the organization', 'CANNOT_REMOVE_LAST_ADMIN')
  }
}

export class InvitationNotFoundException extends OrganizationDomainException {
  constructor(invitationId: string) {
    super(`Invitation with id ${invitationId} not found`, 'INVITATION_NOT_FOUND')
  }
}
