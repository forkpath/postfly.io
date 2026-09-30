// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PaywallResult } from '@libs/billing-contract'

import { usePaywall } from './use-paywall'

const sdk = vi.hoisted(() => ({ setAttributes: vi.fn(), getCustomerInfo: vi.fn(), presentPaywall: vi.fn() }))
vi.mock('react-native-purchases', () => ({ default: sdk }))
vi.mock('react-native-purchases-ui', () => ({
  default: sdk,
  PAYWALL_RESULT: {
    PURCHASED: 'PURCHASED',
    RESTORED: 'RESTORED',
    CANCELLED: 'CANCELLED',
    NOT_PRESENTED: 'NOT_PRESENTED',
    ERROR: 'ERROR'
  }
}))

describe('native paywall adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    sdk.getCustomerInfo.mockResolvedValue({ originalAppUserId: 'customer' })
  })
  afterEach(cleanup)

  it.each([
    ['PURCHASED', PaywallResult.PURCHASED, 'onPurchase'],
    ['RESTORED', PaywallResult.RESTORED, 'onRestore'],
    ['CANCELLED', PaywallResult.DISMISSED, 'onDismiss'],
    ['NOT_PRESENTED', PaywallResult.SKIPPED, 'onSkip'],
    ['ERROR', PaywallResult.ERROR, 'onError']
  ] as const)('maps %s to the public result and appropriate callbacks', async (nativeResult, expected, callback) => {
    sdk.presentPaywall.mockResolvedValue(nativeResult)
    const callbacks = { onPurchase: vi.fn(), onRestore: vi.fn(), onDismiss: vi.fn(), onSkip: vi.fn(), onError: vi.fn() }
    const { result } = renderHook(() => usePaywall(callbacks))
    expect(result.current.result).toBe(PaywallResult.IDLE)
    await act(() => result.current.present({ trigger: 'premium-feature' }))
    expect(result.current.result).toBe(expected)
    expect(callbacks[callback]).toHaveBeenCalledOnce()
    expect(sdk.setAttributes).toHaveBeenCalledWith({ trigger: 'premium-feature' })
    const successful = nativeResult === 'PURCHASED' || nativeResult === 'RESTORED'
    expect(sdk.getCustomerInfo).toHaveBeenCalledTimes(successful ? 1 : 0)
    if (successful)
      expect(callbacks[callback]).toHaveBeenCalledWith({ customerInfo: { originalAppUserId: 'customer' } })
    if (nativeResult === 'NOT_PRESENTED') expect(callbacks.onDismiss).not.toHaveBeenCalled()
    if (nativeResult !== 'ERROR') expect(callbacks.onError).not.toHaveBeenCalled()
  })

  it('reports an SDK failure without opening the paywall or claiming a purchase', async () => {
    const error = new Error('SDK unavailable')
    sdk.setAttributes.mockRejectedValue(error)
    const onError = vi.fn()
    const onPurchase = vi.fn()
    const { result } = renderHook(() => usePaywall({ onError, onPurchase }))
    await act(() => result.current.present({ trigger: 'premium-feature' }))
    expect(result.current.result).toBe(PaywallResult.ERROR)
    expect(onError).toHaveBeenCalledWith(error)
    expect(onPurchase).not.toHaveBeenCalled()
    expect(sdk.presentPaywall).not.toHaveBeenCalled()
  })
})
