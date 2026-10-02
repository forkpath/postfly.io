import type { CSSProperties } from 'react'
import type { AppShellProps } from './types'

import { memo, useState } from 'react'
import { useLocation } from '@tanstack/react-router'

import { Sidebar, SidebarHeader, SidebarProvider } from '@libs/ui-web'

import { AccountSwitcher } from '../../../../modules/organization/account-switcher'
import { AppHeader } from './app-header'
import { useNavigationStore } from './navigation-store'
import { PrimaryNavigation } from './primary-navigation'
import { useSecondaryNav } from './secondary-nav-context'
import { useHoverNavigation } from './use-hover-navigation'
import { isNavigationPathActive, useNavigationRoute, USER_NAV_PATHS } from './use-navigation-route'
import { UserNavigationMenu } from './user-navigation-menu'
import { UserSecondaryNav } from './user-secondary-nav'

export type { AppShellSubItem, AppShellMenuItem } from './types'
export type { SecondaryNavItem, SecondaryNavConfig, CustomSecondaryNavValue } from './secondary-nav-context'
export { SecondaryNavProvider, useSecondaryNav } from './secondary-nav-context'
export type { NavItem, NavGroup, NavStatCard, NavProgress } from './nav-config'
export { flattenNavConfig, getDefaultSubRoute } from './nav-config'
export { SecondaryNavRenderer } from './secondary-nav-renderer'

const AppShellInner = memo<AppShellProps>(({ user, menu, children, headerActions }) => {
  const { pathname } = useLocation()
  const secondaryNav = useSecondaryNav()
  const userNavExpanded = useNavigationStore(state => state.userNavExpanded)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const hover = useHoverNavigation()
  useNavigationRoute(menu, pathname)

  const activeMenuItem = menu.find(item => isNavigationPathActive(pathname, item.href))
  const hasSecondaryNav = Boolean(secondaryNav?.desktopContent || activeMenuItem?.subItems?.length)
  const moduleNavContentReady = Boolean(secondaryNav?.desktopContent)
  const userRouteActive = USER_NAV_PATHS.some(prefix => isNavigationPathActive(pathname, prefix))
  // Retain the user panel until the destination module mounts its secondary navigation.
  const showUserSecondaryNav = userNavExpanded && (userRouteActive || !hasSecondaryNav || !moduleNavContentReady)
  const showModuleSecondaryNav = hasSecondaryNav && moduleNavContentReady && !showUserSecondaryNav
  const navigationProps = { sidebarVisible, expandedMenu, setExpandedMenu, hover }

  return (
    <>
      <Sidebar collapsible="icon" className="**:data-[slot=sidebar-inner]:bg-card">
        <SidebarHeader>
          <AccountSwitcher user={user} />
        </SidebarHeader>
        <PrimaryNavigation menu={menu} {...navigationProps} />
        <UserNavigationMenu user={user} {...navigationProps} />
      </Sidebar>
      {/* ========== 二级导航区域 ========== */}
      {sidebarVisible && (
        <>
          {/* 用户二级导航 */}
          {showUserSecondaryNav && (
            <div className="bg-muted sticky top-0 flex h-dvh w-65 flex-col border-r max-md:hidden">
              <UserSecondaryNav user={user} />
            </div>
          )}

          {/* 模块二级导航（showModuleSecondaryNav 已确保 desktopContent 非空） */}
          {showModuleSecondaryNav && (
            <div className="bg-muted sticky top-0 flex h-dvh w-65 flex-col border-r max-md:hidden">
              <div className="flex flex-1 flex-col overflow-y-auto">{secondaryNav?.desktopContent}</div>
            </div>
          )}
        </>
      )}

      {/* ========== 主内容区域 ========== */}
      <div className="flex flex-1 flex-col">
        {/* 顶部 Header（不再包含用户头像） */}
        <AppHeader
          onToggleSidebar={() => {
            hover.close()
            setSidebarVisible(prev => !prev)
          }}
          actions={headerActions}
          showSidebarToggle={hasSecondaryNav || showUserSecondaryNav}
        />

        {/* 页面主内容 */}
        <main className="size-full flex-1 px-4 py-6 sm:px-6">{children}</main>

        {/* 页脚 */}
        <footer className="flex items-center justify-between gap-3 px-4 py-3 max-md:flex-col sm:px-6 md:gap-6">
          <p className="text-muted-foreground max-md:text-center text-sm text-balance">
            {`©${new Date().getFullYear()}`} Ray
          </p>
        </footer>
      </div>
    </>
  )
})

AppShellInner.displayName = 'AppShellInner'

export const AppShell = memo<AppShellProps>(props => {
  return (
    <div className="flex min-h-dvh w-full">
      <SidebarProvider defaultOpen={false} style={{ '--sidebar-width-icon': '3.5625rem' } as CSSProperties}>
        <AppShellInner {...props} />
      </SidebarProvider>
    </div>
  )
})

AppShell.displayName = 'AppShell'
