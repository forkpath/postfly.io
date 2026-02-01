/**
 * 用户ID值对象
 *
 * 封装用户ID的验证逻辑，确保ID格式正确
 */
export class UserId {
  private constructor(private readonly value: string) {}

  static create(id: string): UserId {
    if (!id || id.trim().length === 0) {
      throw new Error('User ID cannot be empty')
    }
    return new UserId(id)
  }

  getValue(): string {
    return this.value
  }

  equals(other: UserId): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
