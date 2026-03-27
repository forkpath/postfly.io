export interface OrganizationEntity {
  readonly id: string
  readonly name: string
  readonly slug: string | null
  readonly logo: string | null
  readonly createdAt: Date
  readonly membersCount: number
}

export interface MemberEntity {
  readonly id: string
  readonly userId: string
  readonly organizationId: string
  readonly role: string
  readonly createdAt: Date
  readonly user: {
    readonly id: string
    readonly name: string
    readonly email: string
    readonly image: string | null
  }
}

export interface InvitationEntity {
  readonly id: string
  readonly email: string
  readonly role: string
  readonly status: string
  readonly expiresAt: Date
  readonly createdAt: Date
  readonly organizationId: string
  readonly inviterId: string
}
