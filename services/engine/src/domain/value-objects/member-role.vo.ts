export const MemberRoleEnum = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member'
} as const

export type MemberRoleValue = (typeof MemberRoleEnum)[keyof typeof MemberRoleEnum]

const ROLE_HIERARCHY: Record<MemberRoleValue, number> = {
  [MemberRoleEnum.OWNER]: 3,
  [MemberRoleEnum.ADMIN]: 2,
  [MemberRoleEnum.MEMBER]: 1
}

export class MemberRole {
  private constructor(private readonly value: MemberRoleValue) {}

  static create(role: string): MemberRole {
    const values = Object.values(MemberRoleEnum) as string[]
    if (!values.includes(role)) {
      throw new Error(`Invalid member role: ${role}`)
    }
    return new MemberRole(role as MemberRoleValue)
  }

  getValue(): MemberRoleValue {
    return this.value
  }

  isOwner(): boolean {
    return this.value === MemberRoleEnum.OWNER
  }

  isHigherThan(other: MemberRole): boolean {
    return ROLE_HIERARCHY[this.value] > ROLE_HIERARCHY[other.value]
  }

  isHigherThanOrEqual(other: MemberRole): boolean {
    return ROLE_HIERARCHY[this.value] >= ROLE_HIERARCHY[other.value]
  }

  equals(other: MemberRole): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
