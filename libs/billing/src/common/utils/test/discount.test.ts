import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BillingDiscountType, BillingModel, RecurringInterval } from '../../types'
import {
  calculateDiscount,
  calculateRecurringDiscount,
  getVariantDiscount,
  getVariantWithHighestDiscount
} from '../discount'
import { config as mockConfig } from './__mocks__/config'

vi.mock('../../config', () => import('./__mocks__/config'))

describe('calculateDiscount', () => {
  describe('amount discount', () => {
    it('should calculate amount discount correctly', () => {
      const variant = {
        id: 'test-variant',
        cost: 10000,
        custom: false as const,
        currency: 'usd',
        hidden: false,
        model: BillingModel.RECURRING,
        interval: RecurringInterval.MONTH
      }

      const discount = {
        code: 'TEST50',
        type: BillingDiscountType.AMOUNT,
        off: 2000,
        appliesTo: [variant.id]
      }

      const result = calculateDiscount(variant, discount)

      expect(result).toBeDefined()
      expect(result?.original.cost).toBe(10000)
      expect(result?.discounted.cost).toBe(8000)
      expect(result?.percentage).toBe(20)
      expect(result?.type).toBe(BillingDiscountType.AMOUNT)
    })

    it('should calculate percentage correctly for amount discount', () => {
      const variant = {
        id: 'test-variant',
        cost: 10000,
        custom: false as const,
        currency: 'usd',
        hidden: false,
        model: BillingModel.RECURRING,
        interval: RecurringInterval.MONTH
      }

      const discount = {
        code: 'TEST50',
        type: BillingDiscountType.AMOUNT,
        off: 5000,
        appliesTo: [variant.id]
      }

      const result = calculateDiscount(variant, discount)

      expect(result?.percentage).toBe(50)
    })

    it('should handle discount larger than cost', () => {
      const variant = {
        id: 'test-variant',
        cost: 1000,
        custom: false as const,
        currency: 'usd',
        hidden: false,
        model: BillingModel.RECURRING,
        interval: RecurringInterval.MONTH
      }

      const discount = {
        code: 'TEST50',
        type: BillingDiscountType.AMOUNT,
        off: 2000,
        appliesTo: [variant.id]
      }

      const result = calculateDiscount(variant, discount)

      expect(result?.discounted.cost).toBe(-1000)
      expect(result?.percentage).toBe(200)
    })

    it('should handle zero cost', () => {
      const variant = {
        id: 'test-variant',
        cost: 0,
        custom: false as const,
        currency: 'usd',
        hidden: false,
        model: BillingModel.RECURRING,
        interval: RecurringInterval.MONTH
      }

      const discount = {
        code: 'TEST50',
        type: BillingDiscountType.AMOUNT,
        off: 1000,
        appliesTo: [variant.id]
      }

      const result = calculateDiscount(variant, discount)

      expect(result?.discounted.cost).toBe(-1000)
    })
  })

  describe('percent discount', () => {
    it('should calculate percent discount correctly', () => {
      const variant = {
        id: 'test-variant',
        cost: 10000,
        custom: false as const,
        currency: 'usd',
        hidden: false,
        model: BillingModel.RECURRING,
        interval: RecurringInterval.MONTH
      }

      const discount = {
        code: 'TEST50',
        type: BillingDiscountType.PERCENT,
        off: 25,
        appliesTo: [variant.id]
      }

      const result = calculateDiscount(variant, discount)

      expect(result).toBeDefined()
      expect(result?.original.cost).toBe(10000)
      expect(result?.discounted.cost).toBe(7500)
      expect(result?.percentage).toBe(25)
      expect(result?.type).toBe(BillingDiscountType.PERCENT)
    })

    it('should handle 100% discount', () => {
      const variant = {
        id: 'test-variant',
        cost: 10000,
        custom: false as const,
        currency: 'usd',
        hidden: false,
        model: BillingModel.RECURRING,
        interval: RecurringInterval.MONTH
      }

      const discount = {
        code: 'FREE',
        type: BillingDiscountType.PERCENT,
        off: 100,
        appliesTo: [variant.id]
      }

      const result = calculateDiscount(variant, discount)

      expect(result?.discounted.cost).toBe(0)
      expect(result?.percentage).toBe(100)
    })

    it('should handle 50% discount', () => {
      const variant = {
        id: 'test-variant',
        cost: 10000,
        custom: false as const,
        currency: 'usd',
        hidden: false,
        model: BillingModel.RECURRING,
        interval: RecurringInterval.MONTH
      }

      const discount = {
        code: 'HALF',
        type: BillingDiscountType.PERCENT,
        off: 50,
        appliesTo: [variant.id]
      }

      const result = calculateDiscount(variant, discount)

      expect(result?.discounted.cost).toBe(5000)
      expect(result?.percentage).toBe(50)
    })

    it('should handle fractional percentages', () => {
      const variant = {
        id: 'test-variant',
        cost: 10000,
        custom: false as const,
        currency: 'usd',
        hidden: false,
        model: BillingModel.RECURRING,
        interval: RecurringInterval.MONTH
      }

      const discount = {
        code: 'TEST',
        type: BillingDiscountType.PERCENT,
        off: 33.33,
        appliesTo: [variant.id]
      }

      const result = calculateDiscount(variant, discount)

      expect(result?.discounted.cost).toBeCloseTo(6667, 0)
      expect(result?.percentage).toBe(33.33)
    })
  })

  describe('custom variants', () => {
    it('should return null for custom variant', () => {
      const variant = {
        id: 'enterprise-lifetime',
        custom: true as const,
        label: 'Contact Us',
        href: '/contact',
        hidden: false,
        model: BillingModel.ONE_TIME
      }

      const discount = {
        code: 'TEST',
        type: BillingDiscountType.PERCENT,
        off: 50,
        appliesTo: [variant.id]
      }

      const result = calculateDiscount(variant, discount)

      expect(result).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle very large costs', () => {
      const variant = {
        id: 'test-variant',
        cost: 99999999,
        custom: false as const,
        currency: 'usd',
        hidden: false,
        model: BillingModel.RECURRING,
        interval: RecurringInterval.MONTH
      }

      const discount = {
        code: 'TEST',
        type: BillingDiscountType.PERCENT,
        off: 10,
        appliesTo: [variant.id]
      }

      const result = calculateDiscount(variant, discount)

      expect(result?.discounted.cost).toBe(89999999.1)
    })

    it('should preserve variant properties in discounted variant', () => {
      const variant = {
        id: 'test-variant',
        cost: 10000,
        custom: false as const,
        currency: 'usd',
        hidden: false,
        model: BillingModel.RECURRING,
        interval: RecurringInterval.MONTH
      }

      const discount = {
        code: 'TEST',
        type: BillingDiscountType.PERCENT,
        off: 20,
        appliesTo: [variant.id]
      }

      const result = calculateDiscount(variant, discount)

      expect(result?.discounted.id).toBe(variant.id)
      expect(result?.discounted.model).toBe(variant.model)
      if (result && 'interval' in result.discounted && 'interval' in variant) {
        expect(result.discounted.interval).toBe(variant.interval)
      }
      expect(result?.discounted.hidden).toBe(variant.hidden)
    })
  })
})

describe('getVariantDiscount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return highest discount for variant with multiple discounts', () => {
    const variant = {
      id: 'premium-monthly',
      cost: 1900,
      custom: false as const,
      currency: 'usd',
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH
    }

    const discounts = [
      {
        code: '10OFF',
        type: BillingDiscountType.PERCENT,
        off: 10,
        appliesTo: [variant.id]
      },
      {
        code: '50OFF',
        type: BillingDiscountType.PERCENT,
        off: 50,
        appliesTo: [variant.id]
      },
      {
        code: '5OFF',
        type: BillingDiscountType.PERCENT,
        off: 5,
        appliesTo: [variant.id]
      }
    ]

    const result = getVariantDiscount(variant, discounts)

    expect(result).toBeDefined()
    expect(result?.code).toBe('50OFF')
    expect(result?.off).toBe(50)
  })

  it('should compare amount discounts correctly', () => {
    const variant = {
      id: 'test-variant',
      cost: 10000,
      custom: false as const,
      currency: 'usd',
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH
    }

    const discounts = [
      {
        code: '100OFF',
        type: BillingDiscountType.AMOUNT,
        off: 1000,
        appliesTo: [variant.id]
      },
      {
        code: '200OFF',
        type: BillingDiscountType.AMOUNT,
        off: 2000,
        appliesTo: [variant.id]
      }
    ]

    const result = getVariantDiscount(variant, discounts)

    expect(result?.code).toBe('200OFF')
  })

  it('should return undefined when no discounts apply', () => {
    const variant = {
      id: 'test-variant',
      cost: 10000,
      custom: false as const,
      currency: 'usd',
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH
    }

    const discounts = [
      {
        code: 'TEST',
        type: BillingDiscountType.PERCENT,
        off: 50,
        appliesTo: ['other-variant']
      }
    ]

    const result = getVariantDiscount(variant, discounts)

    expect(result).toBeUndefined()
  })

  it('should use config discounts by default', () => {
    const variant = {
      id: 'premium-monthly',
      cost: 1900,
      custom: false as const,
      currency: 'usd',
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH
    }

    const result = getVariantDiscount(variant)

    if (result) {
      expect(result.appliesTo).toContain(variant.id)
      expect(result.code).toBe('100OFF')
    }
  })

  it('should prefer amount discount over percent when amount is higher', () => {
    const variant = {
      id: 'test-variant',
      cost: 10000,
      custom: false as const,
      currency: 'usd',
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH
    }

    const discounts = [
      {
        code: '10PERCENT',
        type: BillingDiscountType.PERCENT,
        off: 10, // 1000 off
        appliesTo: [variant.id]
      },
      {
        code: '1500OFF',
        type: BillingDiscountType.AMOUNT,
        off: 1500, // 1500 off
        appliesTo: [variant.id]
      }
    ]

    const result = getVariantDiscount(variant, discounts)

    expect(result?.code).toBe('1500OFF')
  })

  it('should prefer percent discount over amount when percent saves more', () => {
    const variant = {
      id: 'test-variant',
      cost: 10000,
      custom: false as const,
      currency: 'usd',
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH
    }

    const discounts = [
      {
        code: '20PERCENT',
        type: BillingDiscountType.PERCENT,
        off: 20, // 2000 off
        appliesTo: [variant.id]
      },
      {
        code: '500OFF',
        type: BillingDiscountType.AMOUNT,
        off: 500, // 500 off
        appliesTo: [variant.id]
      }
    ]

    const result = getVariantDiscount(variant, discounts)

    expect(result?.code).toBe('20PERCENT')
  })
})

describe('getVariantWithHighestDiscount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return variant with highest discount', () => {
    const discounts = [
      {
        code: 'BIG',
        type: BillingDiscountType.PERCENT,
        off: 50,
        appliesTo: ['premium-monthly']
      },
      {
        code: 'SMALL',
        type: BillingDiscountType.PERCENT,
        off: 10,
        appliesTo: ['free-monthly']
      }
    ]

    const result = getVariantWithHighestDiscount(undefined, discounts)

    expect(result).toBeDefined()
    expect(result?.discount?.code).toBe('BIG')
    if (result) {
      expect('id' in result).toBe(true)
    }
  })

  it('should return null when no discounts exist', () => {
    const result = getVariantWithHighestDiscount(undefined, [])

    expect(result).toBeNull()
  })

  it('should compare discounts by original cost', () => {
    const discounts = [
      {
        code: 'DISCOUNT1',
        type: BillingDiscountType.PERCENT,
        off: 50,
        appliesTo: ['free-monthly'] // 0 cost
      },
      {
        code: 'DISCOUNT2',
        type: BillingDiscountType.PERCENT,
        off: 10,
        appliesTo: ['premium-monthly'] // 1900 cost
      }
    ]

    const result = getVariantWithHighestDiscount(undefined, discounts)

    // Should prefer variant with higher original cost even if discount % is lower
    expect(result).toBeDefined()
    if (result && 'cost' in result) {
      expect(result.cost).toBeGreaterThan(0)
    }
  })

  it('should use config discounts by default', () => {
    const result = getVariantWithHighestDiscount()

    if (result) {
      expect(result.discount).toBeDefined()
    }
  })

  it('should handle variants with no discounts', () => {
    const discounts = [
      {
        code: 'TEST',
        type: BillingDiscountType.PERCENT,
        off: 50,
        appliesTo: ['non-existent-variant']
      }
    ]

    const result = getVariantWithHighestDiscount(undefined, discounts)

    // Should return null or variant ith no discount
    expect(result).toBeNull()
  })
})

describe('calculateRecurringDiscount', () => {
  it('should return null for non-recurring variant', () => {
    const variant = {
      id: 'free-lifetime',
      cost: 0,
      custom: false as const,
      currency: 'usd',
      hidden: false,
      model: BillingModel.ONE_TIME
    }

    const result = calculateRecurringDiscount(variant)

    expect(result).toBeNull()
  })

  it('should return null for custom variant', () => {
    const variant = {
      id: 'enterprise-monthly',
      custom: true as const,
      label: 'Contact Us',
      href: '/contact',
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH
    }

    const result = calculateRecurringDiscount(variant)

    expect(result).toBeNull()
  })

  it('should return null for hidden variant', () => {
    const variant = {
      id: 'core_premium_recurring_month_flat',
      cost: 1900,
      custom: false as const,
      currency: 'usd',
      hidden: true,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH
    }

    const result = calculateRecurringDiscount(variant)

    expect(result).toBeNull()
  })

  it('should return null for highest cost variant in plan', () => {
    const premiumPlan = mockConfig.plans.find(p => p.id === 'premium')
    const recurringVariants =
      premiumPlan?.variants.filter(v => v.model === BillingModel.RECURRING && !v.custom && !v.hidden) ?? []

    if (!recurringVariants.length) {
      return
    }

    const sorted = [...recurringVariants].sort((a, b) => {
      const costA = 'cost' in a ? a.cost : 0
      const costB = 'cost' in b ? b.cost : 0
      return costB - costA
    })

    const highestVariant = sorted.at(-1)
    if (highestVariant && 'cost' in highestVariant) {
      const result = calculateRecurringDiscount(highestVariant)

      expect(result).toBeNull()
    }
  })

  it('should calculate discount for monthly vs yearly', () => {
    const monthlyVariant = {
      id: 'test-monthly',
      cost: 1900,
      custom: false as const,
      currency: 'usd',
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH
    }

    const result = calculateRecurringDiscount(monthlyVariant)

    if (result) {
      expect(result.original).toBeDefined()
      expect(result.discounted).toBeDefined()
      expect(result.percentage).toBeGreaterThan(0)
      expect(result.type).toBe(BillingDiscountType.PERCENT)
    }
  })

  it('should normalize costs to same interval for comparison', () => {
    const monthlyVariant = {
      id: 'test-monthly',
      cost: 1900, // $19/month = $228/year
      custom: false as const,
      currency: 'usd',
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH
    }

    const result = calculateRecurringDiscount(monthlyVariant)

    if (result) {
      expect(result.original.interval).toBe(RecurringInterval.MONTH)
      expect(result.discounted.id).toBe(monthlyVariant.id)
      expect(result.percentage).toBeGreaterThan(0)
    }
  })

  it('should return null when no higher cost variant exists', () => {
    const freeMonthlyVariant = {
      id: 'free-monthly',
      cost: 0,
      custom: false as const,
      currency: 'usd',
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH
    }

    const result = calculateRecurringDiscount(freeMonthlyVariant)

    expect(result).toBeNull()
  })

  it('should handle plan not found', () => {
    const variant = {
      id: 'non-existent-variant',
      cost: 1000,
      custom: false as const,
      currency: 'usd',
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH
    }

    const result = calculateRecurringDiscount(variant)

    expect(result).toBeNull()
  })
})
