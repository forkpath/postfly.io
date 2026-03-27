export class OrganizationSlug {
  private static readonly SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  private static readonly MIN_LENGTH = 1
  private static readonly MAX_LENGTH = 64

  private constructor(private readonly value: string) {}

  static create(slug: string): OrganizationSlug {
    const normalized = slug.toLowerCase().trim()
    if (normalized.length < OrganizationSlug.MIN_LENGTH || normalized.length > OrganizationSlug.MAX_LENGTH) {
      throw new Error(
        `Organization slug must be between ${OrganizationSlug.MIN_LENGTH} and ${OrganizationSlug.MAX_LENGTH} characters`
      )
    }
    if (!OrganizationSlug.SLUG_REGEX.test(normalized)) {
      throw new Error('Organization slug must contain only lowercase letters, numbers, and hyphens')
    }
    return new OrganizationSlug(normalized)
  }

  getValue(): string {
    return this.value
  }

  equals(other: OrganizationSlug): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
