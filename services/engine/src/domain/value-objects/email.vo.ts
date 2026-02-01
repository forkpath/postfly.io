/**
 * 邮箱值对象
 *
 * 封装邮箱的验证逻辑
 */
export class Email {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  private constructor(private readonly value: string) {}

  static create(email: string): Email {
    const normalized = email.toLowerCase().trim()
    if (!Email.EMAIL_REGEX.test(normalized)) {
      throw new Error('Invalid email format')
    }
    return new Email(normalized)
  }

  getValue(): string {
    return this.value
  }

  equals(other: Email): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
