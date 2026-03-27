export abstract class CustomerDomainException extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class CustomerNotFoundException extends CustomerDomainException {
  constructor(id: string) {
    super(`Customer with id ${id} not found`, 'CUSTOMER_NOT_FOUND')
  }
}
