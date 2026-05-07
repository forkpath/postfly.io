import { EntityId } from './entity-id.vo'

export class CustomerId extends EntityId {
  private constructor(value: string) {
    super(value)
  }

  static create(id: string): CustomerId {
    return new CustomerId(id)
  }
}
