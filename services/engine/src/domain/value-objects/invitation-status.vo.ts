export const InvitationStatusEnum = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  CANCELED: 'canceled',
  REJECTED: 'rejected'
} as const

export type InvitationStatusValue = (typeof InvitationStatusEnum)[keyof typeof InvitationStatusEnum]

const VALID_TRANSITIONS: Record<InvitationStatusValue, InvitationStatusValue[]> = {
  [InvitationStatusEnum.PENDING]: [
    InvitationStatusEnum.ACCEPTED,
    InvitationStatusEnum.CANCELED,
    InvitationStatusEnum.REJECTED
  ],
  [InvitationStatusEnum.ACCEPTED]: [],
  [InvitationStatusEnum.CANCELED]: [],
  [InvitationStatusEnum.REJECTED]: []
}

export class InvitationStatus {
  private constructor(private readonly value: InvitationStatusValue) {}

  static create(status: string): InvitationStatus {
    const values = Object.values(InvitationStatusEnum) as string[]
    if (!values.includes(status)) {
      throw new Error(`Invalid invitation status: ${status}`)
    }
    return new InvitationStatus(status as InvitationStatusValue)
  }

  getValue(): InvitationStatusValue {
    return this.value
  }

  canTransitionTo(target: InvitationStatusValue): boolean {
    return VALID_TRANSITIONS[this.value].includes(target)
  }

  isPending(): boolean {
    return this.value === InvitationStatusEnum.PENDING
  }

  equals(other: InvitationStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
