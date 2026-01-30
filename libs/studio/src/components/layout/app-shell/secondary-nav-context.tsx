import type { ReactNode } from 'react'
import type { SecondaryNavItem, SecondaryNavState } from './secondary-nav-store'

import { useEffect } from 'react'

import { useShallow } from 'zustand/shallow'

import { useSecondaryNavStore } from './secondary-nav-store'

export type { SecondaryNavItem, SecondaryNavState }

export interface SecondaryNavConfig {
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
   * 二级导航标题（用于移动端折叠菜单的分组标题）
   */
  title?: string
}

export interface SecondaryNavProviderProps {
  readonly children: ReactNode
  readonly value: SecondaryNavConfig
}

/**
 * 二级导航 Provider
 * 在 mount 时设置导航内容，unmount 时清除
 */
export function SecondaryNavProvider({ children, value }: SecondaryNavProviderProps) {
  const setSecondaryNav = useSecondaryNavStore(state => state.setSecondaryNav)
  const clearSecondaryNav = useSecondaryNavStore(state => state.clearSecondaryNav)

  useEffect(() => {
    setSecondaryNav({
      desktopContent: value.desktopContent ?? null,
      mobileItems: value.mobileItems ?? [],
      title: value.title ?? null
    })

    return () => {
      clearSecondaryNav()
    }
  }, [value, setSecondaryNav, clearSecondaryNav])

  return <>{children}</>
}

/**
 * 获取当前二级导航状态的 hook
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
