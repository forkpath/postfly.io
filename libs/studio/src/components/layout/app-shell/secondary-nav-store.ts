/**
 * 二级导航状态管理 Store
 *
 * 使用 Zustand 管理二级导航的内容状态。
 * 二级导航的内容由各个页面/模块通过 SecondaryNavProvider 动态设置。
 *
 * 设计说明：
 * - desktopContent: 大屏模式下显示的完整 ReactNode，提供最大的 UI 自由度
 * - mobileItems: 小屏/折叠模式下的菜单项列表，确保移动端体验一致
 * - title: 二级导航标题，用于移动端折叠菜单的分组标题
 */

import type { ReactNode } from 'react'

import { create } from 'zustand'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 二级导航菜单项
 * 用于小屏/折叠模式下的下拉菜单
 */
export interface SecondaryNavItem {
  /** 菜单项图标 */
  icon: ReactNode
  /** 菜单项标签 */
  label: string
  /** 跳转路径 */
  href: string
}

/**
 * 二级导航状态
 */
export interface SecondaryNavState {
  /**
   * 大屏模式下的完整自定义渲染内容
   * 可以是任意 ReactNode，例如复杂的仪表板式导航
   */
  desktopContent: ReactNode | null
  /**
   * 小屏/折叠模式下的菜单项
   * 使用结构化数据，便于在下拉菜单中统一渲染
   */
  mobileItems: SecondaryNavItem[]
  /**
   * 二级导航标题
   * 用于移动端折叠菜单的分组标题显示
   */
  title: string | null
}

/**
 * 二级导航操作
 */
interface SecondaryNavActions {
  /**
   * 设置二级导航内容
   * 支持部分更新，只传入需要修改的字段
   */
  setSecondaryNav: (nav: Partial<SecondaryNavState>) => void
  /**
   * 清除二级导航内容
   * 将状态重置为初始值
   */
  clearSecondaryNav: () => void
}

// ============================================================================
// Store 实现
// ============================================================================

/** 初始状态 */
const initialState: SecondaryNavState = {
  desktopContent: null,
  mobileItems: [],
  title: null
}

/**
 * 二级导航状态 Store
 *
 * @example
 * ```tsx
 * // 设置二级导航
 * const setNav = useSecondaryNavStore(state => state.setSecondaryNav)
 * setNav({
 *   desktopContent: <MyCustomNav />,
 *   mobileItems: [{ icon: <Icon />, label: 'Home', href: '/' }],
 *   title: 'Dashboard'
 * })
 *
 * // 清除二级导航
 * const clearNav = useSecondaryNavStore(state => state.clearSecondaryNav)
 * clearNav()
 * ```
 */
export const useSecondaryNavStore = create<SecondaryNavState & SecondaryNavActions>(set => ({
  ...initialState,
  setSecondaryNav: nav => set(state => ({ ...state, ...nav })),
  clearSecondaryNav: () => set(initialState)
}))
