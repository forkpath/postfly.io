import type { DomainHttpStatus } from './domain.exception'

import { DomainException } from './domain.exception'

export abstract class CustomerDomainException extends DomainException {
  abstract readonly code: string
  abstract readonly i18nKey: string
  abstract readonly httpStatus: DomainHttpStatus
}

export class CustomerNotFoundException extends CustomerDomainException {
  readonly code = 'CUSTOMER_NOT_FOUND'
  readonly i18nKey = 'customer.error.customerNotFound'
  readonly httpStatus = 404

  constructor(id: string) {
    super(`Customer with id ${id} not found`, { id })
  }
}
