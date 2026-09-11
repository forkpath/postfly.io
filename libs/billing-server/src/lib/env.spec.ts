import type { BillingRolloutConfiguration } from './env'

import { describe, expect, it } from 'vitest'

import { assertBillingRolloutConfiguration } from './env'

function configuration(overrides: Partial<BillingRolloutConfiguration> = {}): BillingRolloutConfiguration {
  return {
    BILLING_OWNER_V2_DUAL_WRITE: false,
    BILLING_OWNER_V2_SHADOW_READ: false,
    BILLING_OWNER_V2_READ: false,
    ORGANIZATION_BILLING_ENABLED: false,
    ...overrides
  }
}

describe('Billing owner rollout configuration', () => {
  it.each([
    configuration(),
    configuration({ BILLING_OWNER_V2_DUAL_WRITE: true }),
    configuration({
      BILLING_OWNER_V2_DUAL_WRITE: true,
      BILLING_OWNER_V2_SHADOW_READ: true
    }),
    configuration({
      BILLING_OWNER_V2_DUAL_WRITE: true,
      BILLING_OWNER_V2_SHADOW_READ: true,
      BILLING_OWNER_V2_READ: true
    }),
    configuration({
      BILLING_OWNER_V2_DUAL_WRITE: true,
      BILLING_OWNER_V2_SHADOW_READ: true,
      BILLING_OWNER_V2_READ: true,
      ORGANIZATION_BILLING_ENABLED: true
    })
  ])('accepts an ordered rollout stage', input => {
    expect(() => assertBillingRolloutConfiguration(input)).not.toThrow()
  })

  it('rejects shadow reads before dual write', () => {
    expect(() => assertBillingRolloutConfiguration(configuration({ BILLING_OWNER_V2_SHADOW_READ: true }))).toThrow(
      'BILLING_OWNER_V2_SHADOW_READ requires BILLING_OWNER_V2_DUAL_WRITE'
    )
  })

  it('rejects V2 reads before shadow reads', () => {
    expect(() =>
      assertBillingRolloutConfiguration(
        configuration({
          BILLING_OWNER_V2_DUAL_WRITE: true,
          BILLING_OWNER_V2_READ: true
        })
      )
    ).toThrow('BILLING_OWNER_V2_READ requires BILLING_OWNER_V2_SHADOW_READ')
  })

  it('rejects organization billing before V2 reads', () => {
    expect(() =>
      assertBillingRolloutConfiguration(
        configuration({
          BILLING_OWNER_V2_DUAL_WRITE: true,
          BILLING_OWNER_V2_SHADOW_READ: true,
          ORGANIZATION_BILLING_ENABLED: true
        })
      )
    ).toThrow('ORGANIZATION_BILLING_ENABLED requires BILLING_OWNER_V2_READ')
  })
})
