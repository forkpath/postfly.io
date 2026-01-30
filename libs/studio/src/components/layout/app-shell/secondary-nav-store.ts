import type { ReactNode } from 'react'

import { create } from 'zustand'

export interface SecondaryNavItem {
  icon: ReactNode
  label: string
  href: string
}

export interface SecondaryNavState {
  /**
   * 大屏模式下的完整自定义渲染内容
   */
  desktopContent: ReactNode | null
  /**
   * 小屏/折叠模式下的菜单项
   */
  mobileItems: SecondaryNavItem[]
  /**
   * 二级导航标题
   */
  title: string | null
}

interface SecondaryNavActions {
  setSecondaryNav: (nav: Partial<SecondaryNavState>) => void
  clearSecondaryNav: () => void
}

const initialState: SecondaryNavState = {
  desktopContent: null,
  mobileItems: [],
  title: null
}

export const useSecondaryNavStore = create<SecondaryNavState & SecondaryNavActions>(set => ({
  ...initialState,
  setSecondaryNav: nav => set(state => ({ ...state, ...nav })),
  clearSecondaryNav: () => set(initialState)
}))
