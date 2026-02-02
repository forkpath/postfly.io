/**
 * 用户二级导航组件
 *
 * 当用户点击 Sidebar 底部的用户头像时，显示此二级导航内容。
 * 包含用户相关的菜单项：个人资料、设置、账单、组织管理、工作空间切换等。
 */

'use client'

import type { ReactNode } from 'react'
import type { ActiveOrganization, Organization, User } from '@libs/auth'

import { memo, useCallback } from 'react'
import { Link, useLocation } from '@tanstack/react-router'

import { useTranslation } from '@libs/i18n'
import { cn } from '@libs/ui-shared/common'
import { Avatar, AvatarFallback, AvatarImage, Button, Icons, Separator } from '@libs/ui-shared/web'

import { pathsConfig } from '../../../config/paths'
import { authClient } from '../../../lib/auth/client'
import { useWorkspaceStore } from '../../../modules/workspace'

// ============================================================================
// 类型定义
// ============================================================================

/** 用户导航菜单项 */
interface UserNavItem {
  /** 菜单项图标 */
  icon: ReactNode
  /** 菜单项标签（翻译 key 或显示文本） */
  label: string
  /** 跳转路径 */
  href: string
}

/** 用户导航菜单分组 */
interface UserNavGroup {
  /** 分组标题（可选） */
  title?: string
  /** 分组内的菜单项 */
  items: UserNavItem[]
}

/** UserSecondaryNav 组件属性 */
interface UserSecondaryNavProps {
  /** 当前登录用户信息 */
  readonly user: User
  /** 用户所属的组织列表 */
  readonly organizations: Organization[]
  /** 当前激活的组织 */
  readonly activeOrg: ActiveOrganization | null | undefined
}

// ============================================================================
// 子组件：导航菜单项
// ============================================================================

interface NavItemProps {
  readonly item: UserNavItem
  readonly isActive: boolean
}

const NavItem = memo<NavItemProps>(({ item, isActive }) => {
  return (
    <Link
      to={item.href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        isActive && 'bg-accent text-accent-foreground font-medium'
      )}
    >
      {item.icon}
      <span>{item.label}</span>
    </Link>
  )
})

NavItem.displayName = 'NavItem'

// ============================================================================
// 子组件：工作空间切换项
// ============================================================================

interface WorkspaceItemProps {
  readonly type: 'personal' | 'organization'
  readonly organization?: Organization
  readonly isActive: boolean
  readonly onSelect: () => void
}

const WorkspaceItem = memo<WorkspaceItemProps>(({ type, organization, isActive, onSelect }) => {
  const { t } = useTranslation('workspace')

  const isPersonal = type === 'personal'
  const name = isPersonal ? t('personal') : (organization?.name ?? '')
  const logo = isPersonal ? undefined : organization?.logo

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
        'hover:bg-accent hover:text-accent-foreground text-left',
        isActive && 'bg-accent text-accent-foreground'
      )}
    >
      <Avatar className="size-6">
        {isPersonal ? (
          <AvatarFallback className="bg-muted text-xs">
            <Icons.User className="text-muted-foreground size-3" />
          </AvatarFallback>
        ) : (
          <>
            <AvatarImage src={logo ?? undefined} alt="" />
            <AvatarFallback className="bg-muted text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
          </>
        )}
      </Avatar>
      <span className="flex-1 truncate">{name}</span>
      {isActive && <Icons.Check className="text-primary size-4 shrink-0" />}
    </button>
  )
})

WorkspaceItem.displayName = 'WorkspaceItem'

// ============================================================================
// 主组件：用户二级导航
// ============================================================================

export const UserSecondaryNav = memo<UserSecondaryNavProps>(({ user, organizations, activeOrg }) => {
  const { t } = useTranslation(['common', 'workspace'])
  const location = useLocation()
  const resetWorkspace = useWorkspaceStore(state => state.reset)

  // 判断菜单项是否激活
  const isActive = useCallback(
    (href: string) => location.pathname === href || location.pathname.startsWith(href + '/'),
    [location.pathname]
  )

  // 退出登录处理
  const handleLogout = useCallback(() => {
    resetWorkspace()
    void authClient.signOut()
  }, [resetWorkspace])

  // 选择个人空间
  const handleSelectPersonal = useCallback(async () => {
    await authClient.organization.setActive({ organizationId: null })
  }, [])

  // 选择组织
  const handleSelectOrganization = useCallback(async (org: Organization) => {
    await authClient.organization.setActive({ organizationId: org.id })
  }, [])

  const isPersonalActive = !activeOrg
  const hasOrganizations = organizations.length > 0

  // 用户账户相关菜单项
  const accountItems: UserNavItem[] = [
    {
      icon: <Icons.User className="size-4" />,
      label: t('account.profile'),
      href: pathsConfig.user.settings.index
    },
    {
      icon: <Icons.Settings className="size-4" />,
      label: t('settings'),
      href: pathsConfig.user.settings.index
    },
    {
      icon: <Icons.CreditCard className="size-4" />,
      label: t('billing'),
      href: pathsConfig.user.settings.billing
    },
    {
      icon: <Icons.Lock className="size-4" />,
      label: t('security'),
      href: pathsConfig.user.settings.security
    }
  ]

  // 组织相关菜单项
  const organizationItems: UserNavItem[] = [
    {
      icon: <Icons.Users className="size-4" />,
      label: t('members'),
      href: pathsConfig.organization.members
    },
    {
      icon: <Icons.Settings2 className="size-4" />,
      label: t('organization') + ' ' + t('settings'),
      href: pathsConfig.organization.settings
    }
  ]

  return (
    <div className="flex h-full flex-col">
      {/* 用户信息头部 */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="size-12">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? ''} />
              <AvatarFallback className="text-lg">{user.name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            {/* 在线状态指示器 */}
            <span className="ring-card absolute right-0 bottom-0 block size-3 rounded-full bg-green-500 ring-2" />
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="text-foreground truncate font-semibold">{user.name}</span>
            <span className="text-muted-foreground truncate text-sm">{user.email}</span>
          </div>
        </div>
      </div>

      {/* 导航菜单区域（可滚动） */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* 账户设置 */}
        <div className="mb-4">
          <span className="text-muted-foreground mb-2 block px-3 text-xs font-medium uppercase">{t('account')}</span>
          <nav className="flex flex-col gap-0.5">
            {accountItems.map(item => (
              <NavItem key={item.href} item={item} isActive={isActive(item.href)} />
            ))}
          </nav>
        </div>

        <Separator className="my-3" />

        {/* 组织管理 */}
        <div className="mb-4">
          <span className="text-muted-foreground mb-2 block px-3 text-xs font-medium uppercase">
            {t('organization')}
          </span>
          <nav className="flex flex-col gap-0.5">
            {organizationItems.map(item => (
              <NavItem key={item.href} item={item} isActive={isActive(item.href)} />
            ))}
          </nav>
        </div>

        {/* 工作空间切换（仅当用户有组织时显示） */}
        {hasOrganizations && (
          <>
            <Separator className="my-3" />
            <div>
              <span className="text-muted-foreground mb-2 block px-3 text-xs font-medium uppercase">
                {t('workspace:switch')}
              </span>
              <nav className="flex flex-col gap-0.5">
                {/* 个人空间 */}
                <WorkspaceItem type="personal" isActive={isPersonalActive} onSelect={handleSelectPersonal} />
                {/* 组织列表 */}
                {organizations.map(org => (
                  <WorkspaceItem
                    key={org.id}
                    type="organization"
                    organization={org}
                    isActive={activeOrg?.id === org.id}
                    onSelect={() => handleSelectOrganization(org)}
                  />
                ))}
              </nav>
            </div>
          </>
        )}
      </div>

      {/* 底部操作区域 */}
      <div className="border-t p-3">
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start gap-3"
          onClick={handleLogout}
        >
          <Icons.LogOut className="size-4" />
          <span>{t('logout.cta')}</span>
        </Button>
      </div>
    </div>
  )
})

UserSecondaryNav.displayName = 'UserSecondaryNav'

// ============================================================================
// 导出用于移动端的菜单项列表
// ============================================================================

/**
 * 获取用户导航的移动端菜单项
 * 用于 Sidebar 折叠时的下拉菜单
 */
export function getUserNavMobileItems(t: (key: string) => string): { icon: ReactNode; label: string; href: string }[] {
  return [
    {
      icon: <Icons.User className="size-4" />,
      label: t('account.profile'),
      href: pathsConfig.user.settings.index
    },
    {
      icon: <Icons.Settings className="size-4" />,
      label: t('settings'),
      href: pathsConfig.user.settings.index
    },
    {
      icon: <Icons.CreditCard className="size-4" />,
      label: t('billing'),
      href: pathsConfig.user.settings.billing
    },
    {
      icon: <Icons.Users className="size-4" />,
      label: t('organization.members'),
      href: pathsConfig.organization.members
    }
  ]
}
