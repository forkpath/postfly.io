import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useHoverNavigation } from './use-hover-navigation'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('navigation hover lifecycle', () => {
  it('ignores a brief pass over an icon and delays opening', () => {
    const { result } = renderHook(useHoverNavigation)
    act(() => result.current.enter(0))
    act(() => vi.advanceTimersByTime(99))
    expect(result.current.openKey).toBeNull()
    act(() => result.current.leave())
    act(() => vi.advanceTimersByTime(300))
    expect(result.current.openKey).toBeNull()
    act(() => result.current.enter(1))
    act(() => vi.advanceTimersByTime(100))
    expect(result.current.openKey).toBe(1)
  })

  it('keeps a menu open while crossing the gap into its portal', () => {
    const { result } = renderHook(useHoverNavigation)
    act(() => result.current.enter(0))
    act(() => vi.advanceTimersByTime(100))
    act(() => result.current.leave())
    act(() => vi.advanceTimersByTime(150))
    act(() => result.current.retain())
    act(() => vi.advanceTimersByTime(300))
    expect(result.current.openKey).toBe(0)
    act(() => result.current.leave())
    act(() => vi.advanceTimersByTime(200))
    expect(result.current.openKey).toBeNull()
  })

  it('switches immediately between module and user menus without reopening an old menu', () => {
    const { result } = renderHook(useHoverNavigation)
    act(() => result.current.enter(0))
    act(() => vi.advanceTimersByTime(100))
    act(() => result.current.leave())
    act(() => result.current.enter('user'))
    expect(result.current.openKey).toBe('user')
    act(() => vi.advanceTimersByTime(300))
    expect(result.current.openKey).toBe('user')
    act(() => result.current.close())
    expect(result.current.openKey).toBeNull()
  })

  it('cancels a pending open on selection and clears timers on unmount', () => {
    const { result, unmount } = renderHook(useHoverNavigation)
    act(() => result.current.enter('user'))
    act(() => result.current.close())
    act(() => vi.advanceTimersByTime(300))
    expect(result.current.openKey).toBeNull()
    act(() => result.current.enter(0))
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
