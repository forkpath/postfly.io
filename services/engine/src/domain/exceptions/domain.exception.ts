export type DomainHttpStatus = 400 | 401 | 403 | 404 | 409 | 422

export abstract class DomainException extends Error {
  abstract readonly code: string
  abstract readonly i18nKey: string
  abstract readonly httpStatus: DomainHttpStatus

  protected constructor(
    message: string,
    public readonly args: Record<string, unknown> = {}
  ) {
    super(message)
    this.name = this.constructor.name
  }
}
