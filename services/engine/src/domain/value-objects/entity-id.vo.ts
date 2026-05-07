export abstract class EntityId {
  protected constructor(private readonly value: string) {
    if (!value.trim()) {
      throw new Error(`${this.constructor.name} cannot be empty`)
    }
  }

  getValue(): string {
    return this.value
  }

  equals(other: EntityId): boolean {
    return this.value === other.value && this.constructor === other.constructor
  }

  toString(): string {
    return this.value
  }
}
