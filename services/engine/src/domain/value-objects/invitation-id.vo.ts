import { EntityId } from './entity-id.vo'

export class InvitationId extends EntityId {
  private constructor(value: string) {
    super(value)
  }

  static create(id: string): InvitationId {
    return new InvitationId(id)
  }
}
