import { EntityId } from './entity-id.vo'

export class MemberId extends EntityId {
  private constructor(value: string) {
    super(value)
  }

  static create(id: string): MemberId {
    return new MemberId(id)
  }
}
