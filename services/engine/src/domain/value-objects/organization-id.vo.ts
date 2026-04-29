import { EntityId } from './entity-id.vo'

export class OrganizationId extends EntityId {
  private constructor(value: string) {
    super(value)
  }

  static create(id: string): OrganizationId {
    return new OrganizationId(id)
  }
}
