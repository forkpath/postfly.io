import type { Menu } from './types'
import type { User } from '@libs/auth'

import React, { memo } from 'react'

import { isKey, useTranslation } from '@libs/i18n'
import { cn } from '@libs/ui-shared/common'
import {
  Icons,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from '@libs/ui-shared/web'

import { GoLink, pathsConfig } from '../../../../index'
import { ROOT_MENU_HREF } from './types'
import { useMenu } from './use-menu'

interface DashboardSidebarProps {
  readonly header?: React.ReactNode
  readonly footer?: React.ReactNode
  readonly user: User
  readonly menu: Menu
}

export const DashboardSidebar = memo<DashboardSidebarProps>(({ header, footer, user, menu }) => {
  const { t, i18n } = useTranslation('common')
  const { setOpenMobile } = useSidebar()
  const { history, onBack, onForward, currentHref, findItemByHref, findParentByHref, isActive } = useMenu(menu)

  return (
    <Sidebar collapsible="icon" className="top-(--banner-height,0px) h-[calc(100svh-var(--banner-height,0px))]">
      <SidebarHeader>{header}</SidebarHeader>

      <div className="relative h-full overflow-clip">
        {Object.values(history)
          .filter(Boolean)
          .map(href => {
            const item = findItemByHref(href)
            const parentHref = findParentByHref(href)

            const parentItem = parentHref ? findItemByHref(parentHref) : null
            const currentMenu = item?.menu ?? parentItem?.menu ?? menu

            return (
              <SidebarContent
                key={href}
                className={cn('h-full', {
                  'pointer-events-none absolute inset-x-0 top-0 opacity-0 blur-xs': href !== currentHref,
                  'translate-x-4': href !== currentHref && href === history.next,
                  '-translate-x-4': href !== currentHref && href === history.previous
                })}
                style={{
                  transition:
                    currentHref === history.next
                      ? 'translate 0.3s, opacity 0.2s 0.1s, filter 0.3s'
                      : 'translate 0.3s, opacity 0.2s, filter 0.3s'
                }}
                inert={href !== currentHref}
              >
                {parentHref &&
                  (() => {
                    const title = item?.title && isKey(item.title, i18n, 'common') ? t(item.title) : item?.title

                    return (
                      <div className="px-2">
                        <SidebarMenuButton onClick={onBack} className="-mb-3 justify-between" tooltip={title}>
                          <Icons.ChevronLeft />
                          {title}
                          <div className="size-4 flex-none"></div>
                        </SidebarMenuButton>
                      </div>
                    )
                  })()}
                {currentMenu.map((group, index) => (
                  <SidebarGroup key={index}>
                    {group.label && (
                      <SidebarGroupLabel className="uppercase">
                        {isKey(group.label, i18n, 'common') ? t(group.label) : group.label}
                      </SidebarGroupLabel>
                    )}
                    <SidebarMenu>
                      {group.items.map(item => {
                        const title = isKey(item.title, i18n, 'common') ? t(item.title) : item.title

                        const active = isActive(item)

                        const props = {
                          tooltip: title,
                          onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                            if (active) {
                              e.preventDefault()
                            } else {
                              setOpenMobile(false)
                            }

                            if (item.menu) {
                              onForward(item.href)
                            }
                          },
                          isActive: active
                        }

                        return (
                          <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton asChild {...props}>
                              <GoLink href={item.href}>
                                {item.icon}
                                <span>{title}</span>
                              </GoLink>
                            </SidebarMenuButton>
                            {item.menu && (
                              <SidebarMenuAction>
                                <Icons.ChevronRight />
                              </SidebarMenuAction>
                            )}
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroup>
                ))}

                {href === ROOT_MENU_HREF && (
                  <SidebarGroup className="mt-auto">
                    <SidebarGroupContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip={t('support')} onClick={() => setOpenMobile(false)}>
                            <GoLink href={pathsConfig.marketing.contact}>
                              <Icons.LifeBuoy />
                              <span>{t('support')}</span>
                            </GoLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip={t('feedback')} onClick={() => setOpenMobile(false)}>
                            <GoLink href={pathsConfig.marketing.contact}>
                              <Icons.MessageCircle />
                              <span>{t('feedback')}</span>
                            </GoLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                )}
              </SidebarContent>
            )
          })}
      </div>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>{footer}</SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
})

DashboardSidebar.displayName = 'DashboardSidebar'

export { useMenu } from './use-menu'
export type { Menu, Item } from './types'
export { ROOT_MENU_HREF } from './types'

// Header components
export { AppHeader, LanguageDropdown, ActivitySheet, NotificationDropdown, ProfileDropdown } from './header'
