import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useNavigationStore } from './navigation-store'
import { useNavigationActions } from './use-navigation-actions'

const router = vi.hoisted(() => ({ pathname: '/home', navigate: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: router.pathname }),
  useNavigate: () => router.navigate
}))
vi.mock('@libs/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => `translated:${key}`, i18n: {} }),
  isKey: (key: string) => key === 'account'
}))

beforeEach(() => {
  router.pathname = '/home'
  router.navigate.mockReset()
  useNavigationStore.getState().resetNavigation()
})
afterEach(cleanup)

describe('primary navigation destinations', () => {
  const item = { href: '/admin', defaultSubRoute: '/admin/users', label: 'Admin', icon: null }

  it('uses the default child route until a previous visit is remembered', () => {
    const { result } = renderHook(useNavigationActions)
    act(() => result.current.navigateToMenu(item))
    expect(router.navigate).toHaveBeenLastCalledWith({ to: '/admin/users' })
    act(() => useNavigationStore.getState().setLastVisitedRoute('/admin', '/admin/organizations'))
    act(() => result.current.navigateToMenu(item))
    expect(router.navigate).toHaveBeenLastCalledWith({ to: '/admin/organizations' })
  })

  it('does not navigate again to the current destination and matches path boundaries', () => {
    router.pathname = '/admin/users'
    const { result } = renderHook(useNavigationActions)
    act(() => result.current.navigateToMenu(item))
    expect(router.navigate).not.toHaveBeenCalled()
    expect(result.current.isMenuActive('/admin')).toBe(true)
    expect(result.current.isMenuActive('/ad')).toBe(false)
    expect(result.current.isUserNavActive()).toBe(false)
  })

  it('opens the user panel and returns to the last user page', () => {
    useNavigationStore.getState().setLastVisitedRoute('/user', '/user/billing')
    const { result } = renderHook(useNavigationActions)
    act(() => result.current.navigateToUser(true))
    expect(useNavigationStore.getState().userNavExpanded).toBe(true)
    expect(router.navigate).toHaveBeenCalledWith({ to: '/user/billing' })
    expect(result.current.translateLabel('account')).toBe('translated:account')
    expect(result.current.translateLabel('Custom menu')).toBe('Custom menu')
  })
})
