/**
 * 二级导航 Context 和 Provider
 *
 * 提供声明式的方式来设置当前页面/模块的二级导航内容。
 * 使用 Provider 模式，在组件挂载时自动设置导航，卸载时自动清除。
 *
 * 支持两种使用方式：
 * 1. 配置式（推荐）：传入 SecondaryNavConfig，自动渲染
 * 2. 自定义式：传入 desktopContent 和 mobileItems
 *
 * @example
 * ```tsx
 * // 方式1：配置式（推荐，数据源唯一）
 * const config = getCrmNavConfig(t)
 * <SecondaryNavProvider config={config}>
 *   <Outlet />
 * </SecondaryNavProvider>
 *
 * // 方式2：自定义式（需要完全自定义 UI 时使用）
 * <SecondaryNavProvider
 *   value={{
 *     desktopContent: <CustomNav />,
 *     mobileItems: customItems,
 *     title: 'Custom'
 *   }}
 * >
 *   <Outlet />
 * </SecondaryNavProvider>
 * ```
 */

import type { ReactNode } from 'react'
import type { SecondaryNavConfig as NavConfig } from './nav-config'
import type { SecondaryNavItem, SecondaryNavState } from './secondary-nav-store'

import { useLayoutEffect, useMemo } from 'react'

import { useShallow } from 'zustand/shallow'

import { flattenNavConfig } from './nav-config'
import { SecondaryNavRenderer } from './secondary-nav-renderer'
import { useSecondaryNavStore } from './secondary-nav-store'

// ============================================================================
// 类型导出
// ============================================================================

export type { SecondaryNavItem, SecondaryNavState }
export type { NavConfig as SecondaryNavConfig }

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 自定义二级导航配置（旧版 API，保留兼容）
 * 用于需要完全自定义 UI 的场景
 */
export interface CustomSecondaryNavValue {
  /**
   * 大屏模式下的完整自定义渲染内容
   * 可以是任意 ReactNode，提供最大的 UI 自由度
   */
  desktopContent?: ReactNode
  /**
   * 小屏/折叠模式下的菜单项
   * 使用结构化数据确保移动端体验一致
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
 *
 * 支持两种方式：
 * 1. config: 传入 SecondaryNavConfig，自动渲染（推荐）
 * 2. value: 传入自定义内容（兼容旧版 API）
 */
export interface SecondaryNavProviderProps {
  /** 子组件 */
  readonly children: ReactNode
  /**
   * 配置式导航（推荐）
   * 传入 SecondaryNavConfig，自动生成 desktopContent 和 mobileItems
   */
  readonly config?: NavConfig
  /**
   * 自定义式导航（兼容旧版 API）
   * 需要完全自定义 UI 时使用
   */
  readonly value?: CustomSecondaryNavValue
  /**
   * 快捷入口区域的标题（仅 config 模式有效）
   */
  readonly quickAccessTitle?: string
}

// ============================================================================
// Provider 组件
// ============================================================================

/**
 * 二级导航 Provider
 *
 * 在组件挂载时设置二级导航内容，卸载时自动清除。
 * 支持两种方式：
 * 1. config: 配置式（推荐），自动生成 UI
 * 2. value: 自定义式，完全自定义 UI
 *
 * @example
 * ```tsx
 * // 方式1：配置式（推荐）
 * function CrmLayout() {
 *   const { t } = useTranslation(['common', 'dashboard'])
 *   const config = getCrmNavConfig(t)
 *
 *   return (
 *     <SecondaryNavProvider config={config}>
 *       <Outlet />
 *     </SecondaryNavProvider>
 *   )
 * }
 *
 * // 方式2：自定义式
 * function CustomLayout() {
 *   return (
 *     <SecondaryNavProvider
 *       value={{
 *         desktopContent: <CustomNav />,
 *         mobileItems: customItems,
 *         title: 'Custom'
 *       }}
 *     >
 *       <Outlet />
 *     </SecondaryNavProvider>
 *   )
 * }
 * ```
 */
export function SecondaryNavProvider({ children, config, value, quickAccessTitle }: SecondaryNavProviderProps) {
  const setSecondaryNav = useSecondaryNavStore(state => state.setSecondaryNav)
  const clearSecondaryNav = useSecondaryNavStore(state => state.clearSecondaryNav)

  // 如果使用配置式，自动生成 desktopContent 和 mobileItems
  const resolvedValue = useMemo(() => {
    if (config) {
      // 配置式：自动生成
      const mobileItems = flattenNavConfig(config)
      return {
        desktopContent: <SecondaryNavRenderer config={config} sectionTitle={quickAccessTitle} />,
        mobileItems,
        title: config.title ?? null
      }
    }

    // 自定义式：使用传入的 value
    return {
      desktopContent: value?.desktopContent ?? null,
      mobileItems: value?.mobileItems ?? [],
      title: value?.title ?? null
    }
  }, [config, value, quickAccessTitle])

  // 使用 useLayoutEffect 在渲染前同步设置二级导航
  // 这样可以避免路由切换时二级导航闪烁的问题
  useLayoutEffect(() => {
    // 组件挂载时设置二级导航
    setSecondaryNav({
      desktopContent: resolvedValue.desktopContent,
      mobileItems: resolvedValue.mobileItems,
      title: resolvedValue.title
    })

    // 组件卸载时清除二级导航
    return () => {
      clearSecondaryNav()
    }
  }, [resolvedValue, setSecondaryNav, clearSecondaryNav])

  return children
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
