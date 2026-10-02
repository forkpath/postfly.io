import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useTypewriter } from './use-typewriter'

describe('useTypewriter', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('advances at the requested speed and stops at completion', () => {
    const { result } = renderHook(() => useTypewriter('Ray', 50))
    act(() => vi.advanceTimersByTime(50))
    expect(result.current).toEqual({ displayText: 'R', isComplete: false })
    act(() => vi.advanceTimersByTime(100))
    expect(result.current).toEqual({ displayText: 'Ray', isComplete: true })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('resets on input changes and releases its timer on unmount', () => {
    const { result, rerender, unmount } = renderHook(({ text }) => useTypewriter(text), {
      initialProps: { text: 'Ray' }
    })
    act(() => vi.advanceTimersByTime(100))
    rerender({ text: 'New' })
    expect(result.current).toEqual({ displayText: '', isComplete: false })
    act(() => vi.advanceTimersByTime(100))
    expect(result.current.displayText).toBe('N')
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('completes empty input without scheduling a timer', () => {
    const { result } = renderHook(() => useTypewriter(''))
    expect(result.current).toEqual({ displayText: '', isComplete: true })
    expect(vi.getTimerCount()).toBe(0)
  })
})
