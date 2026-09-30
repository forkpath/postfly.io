import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useNavigationStore } from './navigation-store'
import { useNavigationRoute } from './use-navigation-route'

const menu = [{ href: '/admin' }, { href: '/crm' }]
beforeEach(() => useNavigationStore.getState().resetNavigation())
afterEach(cleanup)

describe('navigation history', () => {
  it('opens a directly loaded user route while allowing a subsequent manual collapse', () => {
    const { rerender } = renderHook(({ path }) => useNavigationRoute(menu, path), {
      initialProps: { path: '/user/profile' }
    })
    expect(useNavigationStore.getState().userNavExpanded).toBe(true)
    act(() => useNavigationStore.getState().setUserNavExpanded(false))
    rerender({ path: '/user/profile' })
    expect(useNavigationStore.getState().userNavExpanded).toBe(false)
    rerender({ path: '/user/settings' })
    expect(useNavigationStore.getState().userNavExpanded).toBe(true)
    expect(useNavigationStore.getState().getLastVisitedRoute('/user', '/fallback')).toBe('/user/settings')
  })

  it('remembers child routes without replacing them with the module root', () => {
    const { rerender } = renderHook(({ path }) => useNavigationRoute(menu, path), {
      initialProps: { path: '/admin/users' }
    })
    rerender({ path: '/admin' })
    expect(useNavigationStore.getState().getLastVisitedRoute('/admin', '/fallback')).toBe('/admin/users')
    rerender({ path: '/crm/contacts' })
    expect(useNavigationStore.getState().getLastVisitedRoute('/crm', '/fallback')).toBe('/crm/contacts')
  })

  it('requires a path boundary for module and user prefixes', () => {
    const { rerender } = renderHook(({ path }) => useNavigationRoute(menu, path), {
      initialProps: { path: '/administrator/users' }
    })
    rerender({ path: '/users/profile' })
    expect(useNavigationStore.getState().lastVisitedRoutes).toEqual({})
    expect(useNavigationStore.getState().userNavExpanded).toBe(false)
  })
})
