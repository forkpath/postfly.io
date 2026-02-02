/**
 * 二级导航 Context 和 Provider
 *
 * 提供声明式的方式来设置当前页面/模块的二级导航内容。
 * 使用 Provider 模式，在组件挂载时自动设置导航，卸载时自动清除。
 *
 * 使用方式：
 * 在需要二级导航的页面中，用 SecondaryNavProvider 包裹页面内容，
 * 并通过 value prop 传入导航配置。
 *
 * @example
 * ```tsx
 * // 在 CRM 模块的布局中
 * <SecondaryNavProvider
 *   value={{
 *     desktopContent: <CrmSecondaryNav />,
 *     mobileItems: crmMobileItems,
 *     title: 'CRM'
 *   }}
 * >
 *   <Outlet />
 * </SecondaryNavProvider>
 * ```
 */

import type { ReactNode } from 'react'
import type { SecondaryNavItem, SecondaryNavState } from './secondary-nav-store'

import { useLayoutEffect } from 'react'

import { useShallow } from 'zustand/shallow'

import { useSecondaryNavStore } from './secondary-nav-store'

// ============================================================================
// 类型导出
// ============================================================================

export type { SecondaryNavItem, SecondaryNavState }

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 二级导航配置
 * 用于 SecondaryNavProvider 的 value prop
 */
export interface SecondaryNavConfig {
  /**
   * 大屏模式下的完整自定义渲染内容
   * 可以是任意 ReactNode，提供最大的 UI 自由度
   *
   * @example
   * ```tsx
   * desktopContent: <CrmSecondaryNav />
   * ```
   */
  desktopContent?: ReactNode
  /**
   * 小屏/折叠模式下的菜单项
   * 使用结构化数据确保移动端体验一致
   *
   * @example
   * ```tsx
   * mobileItems: [
   *   { icon: <DashboardIcon />, label: 'Dashboard', href: '/crm' },
   *   { icon: <OrderIcon />, label: 'Orders', href: '/crm/orders' }
   * ]
   * ```
   */
  mobileItems?: SecondaryNavItem[]
  /**
   * 二级导航标题
   * 用于移动端折叠菜单的分组标题
   */
  title?: string
}

/**
 * SecondaryNavProvider 组件属性
 */
export interface SecondaryNavProviderProps {
  /** 子组件 */
  readonly children: ReactNode
  /** 二级导航配置 */
  readonly value: SecondaryNavConfig
}

// ============================================================================
// Provider 组件
// ============================================================================

/**
 * 二级导航 Provider
 *
 * 在组件挂载时设置二级导航内容，卸载时自动清除。
 * 这确保了导航状态与路由/组件生命周期同步。
 *
 * @example
 * ```tsx
 * function CrmLayout() {
 *   return (
 *     <SecondaryNavProvider
 *       value={{
 *         desktopContent: <CrmSecondaryNav />,
 *         mobileItems: [
 *           { icon: <Icons.Home />, label: 'home', href: '/crm' }
 *         ],
 *         title: 'CRM'
 *       }}
 *     >
 *       <Outlet />
 *     </SecondaryNavProvider>
 *   )
 * }
 * ```
 */
export function SecondaryNavProvider({ children, value }: SecondaryNavProviderProps) {
  const setSecondaryNav = useSecondaryNavStore(state => state.setSecondaryNav)
  const clearSecondaryNav = useSecondaryNavStore(state => state.clearSecondaryNav)

  // 使用 useLayoutEffect 在渲染前同步设置二级导航
  // 这样可以避免路由切换时二级导航闪烁的问题
  // useLayoutEffect 会在 DOM 更新后、浏览器绑制前同步执行
  useLayoutEffect(() => {
    // 组件挂载时设置二级导航
    setSecondaryNav({
      desktopContent: value.desktopContent ?? null,
      mobileItems: value.mobileItems ?? [],
      title: value.title ?? null
    })

    // 组件卸载时清除二级导航
    return () => {
      clearSecondaryNav()
    }
  }, [value, setSecondaryNav, clearSecondaryNav])

  return <>{children}</>
}

// ============================================================================
// Hook
// ============================================================================

/**
 * 获取当前二级导航状态的 Hook
 *
 * 使用 useShallow 进行浅比较，避免不必要的重渲染。
 *
 * @returns 当前二级导航状态，包含 desktopContent、mobileItems 和 title
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { desktopContent, mobileItems, title } = useSecondaryNav()
 *
 *   if (!desktopContent && mobileItems.length === 0) {
 *     return null // 没有二级导航
 *   }
 *
 *   return <div>{desktopContent}</div>
 * }
 * ```
 */
export function useSecondaryNav() {
  return useSecondaryNavStore(
    useShallow(state => ({
      desktopContent: state.desktopContent,
      mobileItems: state.mobileItems,
      title: state.title
    }))
  )
}
