import { OrganizationId } from './organization-id.vo'
import { UserId } from './user-id.vo'

export type BillingOwnerKind = 'user' | 'organization'

export class BillingOwner {
  private constructor(
    public readonly kind: BillingOwnerKind,
    private readonly userId?: UserId,
    private readonly organizationId?: OrganizationId
  ) {}

  static forUser(userId: string): BillingOwner {
    return new BillingOwner('user', UserId.create(userId))
  }

  static forOrganization(organizationId: string): BillingOwner {
    return new BillingOwner('organization', undefined, OrganizationId.create(organizationId))
  }

  get id(): string {
    if (this.kind === 'user' && this.userId) {
      return this.userId.getValue()
    }
    if (this.organizationId) {
      return this.organizationId.getValue()
    }
    throw new Error('Billing owner is invalid')
  }

  isOwnedBy(userId: UserId): boolean {
    return this.kind === 'user' && Boolean(this.userId?.equals(userId))
  }
}
