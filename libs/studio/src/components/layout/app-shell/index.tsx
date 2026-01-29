import type { CSSProperties, ReactNode } from 'react'
import type { User } from '@libs/auth'

import { memo, useCallback, useRef, useState } from 'react'

import { isKey, useTranslation } from '@libs/i18n'
import { cn } from '@libs/ui-shared/common'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icons,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar
} from '@libs/ui-shared/web'

import { GoLink } from '../../go-link'
import { AppHeader } from './app-header'

export interface AppShellMenuItem {
  icon: ReactNode
  label: string
  href: string
  subItems?: AppShellSubMenuItem[]
}

export interface AppShellSubMenuItem {
  icon: ReactNode
  label: string
  href: string
}

interface AppShellProps {
  readonly user: User
  readonly menu: AppShellMenuItem[]
  readonly children: ReactNode
  readonly headerActions?: ReactNode
  readonly logo?: ReactNode
}

const HOVER_OPEN_DELAY = 100
const HOVER_CLOSE_DELAY = 200

const AppShellInner = memo<AppShellProps>(({ user, menu, children, headerActions, logo }) => {
  const { t, i18n } = useTranslation('common')
  const { setOpenMobile } = useSidebar()
  const [activeMenuIndex, setActiveMenuIndex] = useState(0)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [hoveredMenu, setHoveredMenu] = useState<number | null>(null)
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHoveringRef = useRef(false)

  const activeMenuItem = menu[activeMenuIndex]

  const clearAllTimeouts = useCallback(() => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current)
      openTimeoutRef.current = null
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
      closeTimeoutRef.current = null
    }
  }, [])

  const handleMenuHover = useCallback(
    (index: number) => {
      isHoveringRef.current = true
      clearAllTimeouts()

      if (hoveredMenu !== null && hoveredMenu !== index) {
        setHoveredMenu(index)
        return
      }

      openTimeoutRef.current = setTimeout(() => {
        if (isHoveringRef.current) {
          setHoveredMenu(index)
        }
      }, HOVER_OPEN_DELAY)
    },
    [clearAllTimeouts, hoveredMenu]
  )

  const handleMenuLeave = useCallback(() => {
    isHoveringRef.current = false
    clearAllTimeouts()

    closeTimeoutRef.current = setTimeout(() => {
      if (!isHoveringRef.current) {
        setHoveredMenu(null)
      }
    }, HOVER_CLOSE_DELAY)
  }, [clearAllTimeouts])

  const handleDropdownContentEnter = useCallback(() => {
    isHoveringRef.current = true
    clearAllTimeouts()
  }, [clearAllTimeouts])

  const handleDropdownContentLeave = useCallback(() => {
    isHoveringRef.current = false
    clearAllTimeouts()

    closeTimeoutRef.current = setTimeout(() => {
      if (!isHoveringRef.current) {
        setHoveredMenu(null)
      }
    }, HOVER_CLOSE_DELAY)
  }, [clearAllTimeouts])

  const handleSubItemClick = useCallback(
    (menuIndex: number) => {
      clearAllTimeouts()
      setActiveMenuIndex(menuIndex)
      setHoveredMenu(null)
      isHoveringRef.current = false
      setOpenMobile(false)
    },
    [clearAllTimeouts, setOpenMobile]
  )

  const translateLabel = (label: string) => (isKey(label, i18n, 'common') ? t(label) : label)

  return (
    <>
      <Sidebar collapsible="icon" className="**:data-[slot=sidebar-inner]:bg-card">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="gap-3 bg-transparent! group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-1! [&>svg]:size-8"
              >
                {logo || <Icons.Logo className="text-primary h-8 shrink-0 transition-[width,height]" />}
                <span className="text-xl font-semibold group-data-[collapsible=icon]:hidden">Ray</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {menu.map((item, index) => (
                  <Collapsible
                    key={item.label}
                    open={expandedMenu === item.label}
                    onOpenChange={open => setExpandedMenu(open ? item.label : null)}
                  >
                    <SidebarMenuItem>
                      {/* 展开状态：点击选择菜单，二级导航面板展示子项 */}
                      {sidebarVisible && (
                        <SidebarMenuButton
                          isActive={activeMenuIndex === index}
                          className="[&>svg]:text-primary hidden group-data-[collapsible=icon]:size-10! md:flex [&>svg]:size-6"
                          tooltip={translateLabel(item.label)}
                          onClick={() => setActiveMenuIndex(index)}
                        >
                          {item.icon}
                          <span>{translateLabel(item.label)}</span>
                        </SidebarMenuButton>
                      )}
                      {/* 折叠状态：hover 显示下拉菜单 */}
                      {!sidebarVisible && (
                        <DropdownMenu open={hoveredMenu === index} modal={false}>
                          <DropdownMenuTrigger asChild>
                            <SidebarMenuButton
                              isActive={activeMenuIndex === index}
                              className="[&>svg]:text-primary hidden group-data-[collapsible=icon]:size-10! md:flex [&>svg]:size-6"
                              onMouseEnter={() => handleMenuHover(index)}
                              onMouseLeave={handleMenuLeave}
                            >
                              {item.icon}
                              <span>{translateLabel(item.label)}</span>
                            </SidebarMenuButton>
                          </DropdownMenuTrigger>
                          {item.subItems && item.subItems.length > 0 && (
                            <DropdownMenuContent
                              side="right"
                              align="start"
                              sideOffset={8}
                              className="w-48"
                              onMouseEnter={handleDropdownContentEnter}
                              onMouseLeave={handleDropdownContentLeave}
                            >
                              <DropdownMenuLabel>{translateLabel(item.label)}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {item.subItems.map(subItem => (
                                <DropdownMenuItem key={subItem.label} asChild onClick={() => handleSubItemClick(index)}>
                                  <GoLink href={subItem.href} className="flex items-center gap-2">
                                    {subItem.icon}
                                    <span>{translateLabel(subItem.label)}</span>
                                  </GoLink>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          )}
                        </DropdownMenu>
                      )}
                      {/* Mobile screen (< md): collapsible with sub-items */}
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={activeMenuIndex === index}
                          className="[&>svg]:text-primary md:hidden [&>svg]:size-6"
                          tooltip={translateLabel(item.label)}
                        >
                          {item.icon}
                          <span className="flex-1">{translateLabel(item.label)}</span>
                          {item.subItems && item.subItems.length > 0 && (
                            <Icons.ChevronRight
                              className={cn(
                                'text-muted-foreground size-4 transition-transform',
                                expandedMenu === item.label && 'rotate-90'
                              )}
                            />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      {/* Sub-items for mobile (collapsible) */}
                      {item.subItems && item.subItems.length > 0 && (
                        <CollapsibleContent className="md:hidden">
                          <div className="border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5">
                            {item.subItems.map(subItem => (
                              <GoLink
                                key={subItem.label}
                                href={subItem.href}
                                onClick={() => setOpenMobile(false)}
                                className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sm"
                              >
                                {subItem.icon}
                                <span>{translateLabel(subItem.label)}</span>
                              </GoLink>
                            ))}
                          </div>
                        </CollapsibleContent>
                      )}
                    </SidebarMenuItem>
                  </Collapsible>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      {/* Secondary Navigation - Dynamic based on active menu */}
      {sidebarVisible && (
        <div className="bg-muted sticky top-0 flex h-dvh w-65 flex-col border-r max-md:hidden">
          <div className="flex flex-1 flex-col overflow-y-auto p-4">
            <div className="mb-4">
              <h2 className="text-foreground mb-4 text-lg font-semibold">
                {translateLabel(activeMenuItem?.label || '')}
              </h2>
            </div>
            {activeMenuItem?.subItems && activeMenuItem.subItems.length > 0 && (
              <div className="flex flex-col gap-1">
                {activeMenuItem.subItems.map(subItem => (
                  <GoLink
                    key={subItem.label}
                    href={subItem.href}
                    className="hover:bg-primary/5 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors"
                  >
                    {subItem.icon}
                    <span>{translateLabel(subItem.label)}</span>
                  </GoLink>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        <AppHeader user={user} onToggleSidebar={() => setSidebarVisible(prev => !prev)} actions={headerActions} />
        <main className="size-full flex-1 px-4 py-6 sm:px-6">{children}</main>
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
