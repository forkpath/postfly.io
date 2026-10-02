import type { ReactNode } from 'react'
import type { HoverNavigation } from './use-hover-navigation'
import type { User } from '@libs/auth-contract'

/** 子菜单项 */
export interface AppShellSubItem {
  /** 菜单项图标 */
  icon: ReactNode
  /** 菜单项标签（翻译 key 或显示文本） */
  label: string
  /** 跳转路径 */
  href: string
}

/**
 * 一级导航菜单项
 * 包含 subItems 用于折叠模式和小屏模式下显示二级导航
 */
export interface AppShellMenuItem {
  /** 菜单项图标 */
  icon: ReactNode
  /** 菜单项标签（翻译 key 或显示文本） */
  label: string
  /** 用于路由匹配判断高亮状态的路径前缀 */
  href: string
  /**
   * 默认子路由路径
   * 当用户首次点击该菜单项时，如果没有访问记录，将跳转到此路径
   * 如果不提供，则默认跳转到 href
   */
  defaultSubRoute?: string
  /**
   * 子菜单项列表
   * 用于折叠模式（hover 显示 dropdown）和小屏模式（展开显示子菜单）
   */
  subItems?: AppShellSubItem[]
}

/** AppShell 组件属性 */
export interface AppShellProps {
  /** 当前登录用户信息 */
  readonly user: User
  /** 一级导航菜单配置 */
  readonly menu: AppShellMenuItem[]
  /** 页面主内容 */
  readonly children: ReactNode
  /** Header 右侧的自定义操作按钮 */
  readonly headerActions?: ReactNode
}

export interface NavigationMenuProps {
  sidebarVisible: boolean
  expandedMenu: string | null
  setExpandedMenu: (menu: string | null) => void
  hover: HoverNavigation
}
