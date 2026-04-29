import { EntityId } from './entity-id.vo'

/**
 * 用户ID值对象
 */
export class UserId extends EntityId {
  private constructor(value: string) {
    super(value)
  }

  static create(id: string): UserId {
    return new UserId(id)
  }
}
