import type { NavigationMenuProps } from './types'
import type { User } from '@libs/auth-contract'

import { cn } from '@libs/ui-core'
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
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@libs/ui-web'

import { GoLink } from '../../go-link'
import { useNavigationStore } from './navigation-store'
import { useNavigationActions } from './use-navigation-actions'
import { getUserNavMobileItems } from './user-secondary-nav'

interface UserNavigationMenuProps extends NavigationMenuProps {
  user: User
}

export function UserNavigationMenu({
  user,
  sidebarVisible,
  expandedMenu,
  setExpandedMenu,
  hover
}: UserNavigationMenuProps) {
  const { setOpenMobile } = useSidebar()
  const { t, isUserNavActive, navigateToUser, translateLabel } = useNavigationActions()
  const userNavExpanded = useNavigationStore(state => state.userNavExpanded)
  const userNavMobileItems = getUserNavMobileItems(t)
  const handleSubItemClick = () => {
    hover.close()
    setOpenMobile(false)
  }
  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          {/* 大屏展开状态：点击跳转到用户路由 */}
          {sidebarVisible && (
            <SidebarMenuButton
              isActive={isUserNavActive()}
              className="hidden h-auto py-2 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-1! md:flex [&>svg]:size-6"
              tooltip={user.name ?? t('account')}
              onClick={() => navigateToUser(true)}
            >
              <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                <Icons.UserRound className="size-5" />
              </span>
              <div className="flex flex-1 flex-col items-start overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
              </div>
              <Icons.ChevronRight
                className={cn(
                  'text-muted-foreground size-4 shrink-0 transition-transform group-data-[collapsible=icon]:hidden',
                  userNavExpanded && 'rotate-90'
                )}
              />
            </SidebarMenuButton>
          )}

          {/* 大屏折叠状态：hover 显示用户菜单下拉，点击跳转到用户路由 */}
          {!sidebarVisible && (
            <DropdownMenu open={hover.openKey === 'user'} modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  isActive={isUserNavActive()}
                  className="hidden h-auto py-2 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-1! md:flex"
                  onMouseEnter={() => hover.enter('user')}
                  onMouseLeave={hover.leave}
                  onClick={() => navigateToUser()}
                >
                  <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                    <Icons.UserRound className="size-5" />
                  </span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={8}
                className="w-48"
                onMouseEnter={hover.retain}
                onMouseLeave={hover.leave}
              >
                <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* 折叠模式下的用户菜单不显示选中状态 */}
                {userNavMobileItems.map(item => (
                  <DropdownMenuItem key={item.href} asChild onClick={handleSubItemClick}>
                    <GoLink href={item.href} className="flex items-center gap-2">
                      {item.icon}
                      <span>{translateLabel(item.label)}</span>
                    </GoLink>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* 小屏模式：可折叠的用户菜单 */}
          <Collapsible
            open={expandedMenu === 'user'}
            onOpenChange={open => setExpandedMenu(open ? 'user' : null)}
            className="md:hidden"
          >
            <CollapsibleTrigger asChild>
              <SidebarMenuButton isActive={isUserNavActive()} className="h-auto py-2 [&>svg]:size-6">
                <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                  <Icons.UserRound className="size-5" />
                </span>
                <div className="flex flex-1 flex-col items-start overflow-hidden">
                  <span className="truncate text-sm font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
                <Icons.ChevronRight
                  className={cn(
                    'text-muted-foreground size-4 shrink-0 transition-transform',
                    expandedMenu === 'user' && 'rotate-90'
                  )}
                />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            {/* 小屏模式下的用户菜单不显示选中状态 */}
            <CollapsibleContent>
              <div className="border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5">
                {userNavMobileItems.map(item => (
                  <GoLink
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpenMobile(false)}
                    className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sm"
                  >
                    {item.icon}
                    <span>{translateLabel(item.label)}</span>
                  </GoLink>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}
