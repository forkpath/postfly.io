export const BillingProviderEnum = {
  STRIPE: 'stripe',
  REVENUECAT: 'revenuecat'
} as const

export type BillingProviderValue = (typeof BillingProviderEnum)[keyof typeof BillingProviderEnum]

export class BillingProviderVO {
  private constructor(private readonly value: BillingProviderValue) {}

  static create(provider: string): BillingProviderVO {
    const values = Object.values(BillingProviderEnum) as string[]
    if (!values.includes(provider)) {
      throw new Error(`Invalid billing provider: ${provider}`)
    }
    return new BillingProviderVO(provider as BillingProviderValue)
  }

  getValue(): BillingProviderValue {
    return this.value
  }

  equals(other: BillingProviderVO): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }
}
