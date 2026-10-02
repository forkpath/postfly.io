import type { MouseEvent } from 'react'
import type { AppShellMenuItem } from './types'

import { useLocation, useNavigate } from '@tanstack/react-router'

import { isKey, useTranslation } from '@libs/i18n'

import { pathsConfig } from '../../../../config/paths'
import { useNavigationStore } from './navigation-store'
import { isNavigationPathActive, USER_NAV_PATHS } from './use-navigation-route'

export function useNavigationActions() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('common')
  const getLastVisitedRoute = useNavigationStore(state => state.getLastVisitedRoute)
  const setUserNavExpanded = useNavigationStore(state => state.setUserNavExpanded)

  const navigateTo = (prefix: string, fallback: string) => {
    const to = getLastVisitedRoute(prefix, fallback)
    if (pathname !== to) void navigate({ to })
  }
  const navigateToMenu = (item: AppShellMenuItem) => navigateTo(item.href, item.defaultSubRoute || item.href)
  const handleMenuItemClick = (item: AppShellMenuItem, event: MouseEvent) => {
    event.preventDefault()
    navigateToMenu(item)
  }
  const navigateToUser = (expand = false) => {
    if (expand) setUserNavExpanded(true)
    navigateTo('/user', pathsConfig.user.profile)
  }

  return {
    t,
    translateLabel: (label: string) => (isKey(label, i18n, 'common') ? t(label) : label),
    isMenuActive: (href: string) => isNavigationPathActive(pathname, href),
    isUserNavActive: () => USER_NAV_PATHS.some(prefix => isNavigationPathActive(pathname, prefix)),
    navigateToMenu,
    handleMenuItemClick,
    navigateToUser
  }
}
