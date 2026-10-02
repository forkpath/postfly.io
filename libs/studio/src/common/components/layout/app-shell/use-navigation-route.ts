import { useEffect } from 'react'

import { useNavigationStore } from './navigation-store'

export const USER_NAV_PATHS = ['/user']

export function isNavigationPathActive(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + '/')
}

/** Synchronize navigation history on route changes, preserving manual collapse. */
export function useNavigationRoute(menu: ReadonlyArray<{ href: string }>, pathname: string) {
  useEffect(() => {
    const { userNavExpanded, setUserNavExpanded, setLastVisitedRoute } = useNavigationStore.getState()
    const matches = (prefix: string) => isNavigationPathActive(pathname, prefix)

    if (USER_NAV_PATHS.some(matches) && !userNavExpanded) setUserNavExpanded(true)

    const module = menu.find(item => matches(item.href))
    if (module && pathname !== module.href) setLastVisitedRoute(module.href, pathname)

    const userPrefix = USER_NAV_PATHS.find(matches)
    if (userPrefix && pathname !== userPrefix) setLastVisitedRoute(userPrefix, pathname)
  }, [menu, pathname])
}
