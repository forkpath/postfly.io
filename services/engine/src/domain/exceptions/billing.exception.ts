import type { DomainHttpStatus } from './domain.exception'

import { DomainException } from './domain.exception'

export class BillingAccessDeniedException extends DomainException {
  readonly code = 'BILLING_ACCESS_DENIED'
  readonly i18nKey = 'billing.error.accessDenied'
  readonly httpStatus: DomainHttpStatus = 403

  constructor(ownerId: string) {
    super('Billing owner access denied', { ownerId })
  }
}

export class OrganizationBillingDisabledException extends DomainException {
  readonly code = 'ORGANIZATION_BILLING_DISABLED'
  readonly i18nKey = 'billing.error.organizationDisabled'
  readonly httpStatus: DomainHttpStatus = 403

  constructor() {
    super('Organization billing is disabled')
  }
}
