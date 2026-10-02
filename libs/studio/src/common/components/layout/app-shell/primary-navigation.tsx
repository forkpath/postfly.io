import type { AppShellMenuItem, NavigationMenuProps } from './types'

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
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@libs/ui-web'

import { GoLink } from '../../go-link'
import { useNavigationActions } from './use-navigation-actions'

interface PrimaryNavigationProps extends NavigationMenuProps {
  menu: AppShellMenuItem[]
}

export function PrimaryNavigation({
  menu,
  sidebarVisible,
  expandedMenu,
  setExpandedMenu,
  hover
}: PrimaryNavigationProps) {
  const { setOpenMobile } = useSidebar()
  const { isMenuActive, translateLabel, navigateToMenu, handleMenuItemClick } = useNavigationActions()
  const handleSubItemClick = () => {
    hover.close()
    setOpenMobile(false)
  }
  return (
    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {menu.map((item, index) => {
              const isActive = isMenuActive(item.href)

              return (
                <Collapsible
                  key={item.label}
                  open={expandedMenu === item.label}
                  onOpenChange={open => setExpandedMenu(open ? item.label : null)}
                >
                  <SidebarMenuItem>
                    {/* 大屏展开状态：点击跳转到最后访问的子路由或默认子路由 */}
                    {sidebarVisible && (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className="[&>svg]:text-primary hidden group-data-[collapsible=icon]:size-10! md:flex [&>svg]:size-6"
                        tooltip={translateLabel(item.label)}
                      >
                        <GoLink href={item.href} onClick={e => handleMenuItemClick(item, e)}>
                          {item.icon}
                          <span>{translateLabel(item.label)}</span>
                        </GoLink>
                      </SidebarMenuButton>
                    )}

                    {/* 大屏折叠状态：hover 显示下拉菜单，点击跳转到对应路由 */}
                    {!sidebarVisible && (
                      <DropdownMenu open={hover.openKey === index} modal={false}>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuButton
                            isActive={isActive}
                            className="[&>svg]:text-primary hidden group-data-[collapsible=icon]:size-10! md:flex [&>svg]:size-6"
                            onMouseEnter={() => hover.enter(index)}
                            onMouseLeave={hover.leave}
                            onClick={() => navigateToMenu(item)}
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
                            onMouseEnter={hover.retain}
                            onMouseLeave={hover.leave}
                          >
                            <DropdownMenuLabel>{translateLabel(item.label)}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {/* 折叠模式下的二级菜单不显示选中状态 */}
                            {item.subItems.map(subItem => (
                              <DropdownMenuItem key={subItem.label} asChild onClick={handleSubItemClick}>
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

                    {/* 小屏模式：可折叠的子菜单 */}
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        isActive={isActive}
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

                    {/* 小屏模式：展开的子菜单内容（不显示选中状态） */}
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
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}
