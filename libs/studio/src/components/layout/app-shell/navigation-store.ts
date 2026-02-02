/**
 * 导航状态管理 Store
 *
 * 使用 Zustand 管理应用的导航状态，支持：
 * - 追踪每个模块最后访问的子路由
 * - 页面刷新后自动恢复导航状态
 * - 用户导航区域的展开/收起状态
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 导航项类型
 * - menu: 普通菜单项（如 CRM、Admin）
 * - user: 用户导航（用户头像点击后显示的导航）
 */
export type NavigationType = 'menu' | 'user'

/**
 * 模块最后访问的路由记录
 * key: 模块的路径前缀（如 '/admin', '/crm'）
 * value: 最后访问的完整路径（如 '/admin/users'）
 */
export type LastVisitedRoutes = Record<string, string>

/**
 * 导航状态接口
 */
export interface NavigationState {
  /** 当前激活的导航类型 */
  activeType: NavigationType | null
  /** 当前激活的导航标识（对于 menu 类型，这是菜单项的 href） */
  activeId: string | null
  /** 用户导航区域是否展开（用于 Sidebar 底部的用户区域） */
  userNavExpanded: boolean
  /** 每个模块最后访问的子路由 */
  lastVisitedRoutes: LastVisitedRoutes
}

/**
 * 导航操作接口
 */
interface NavigationActions {
  /** 设置当前激活的导航 */
  setActiveNav: (type: NavigationType, id: string) => void
  /** 清除当前激活的导航 */
  clearActiveNav: () => void
  /** 切换用户导航展开状态 */
  toggleUserNav: () => void
  /** 设置用户导航展开状态 */
  setUserNavExpanded: (expanded: boolean) => void
  /**
   * 记录模块的最后访问路由
   * @param modulePrefix 模块路径前缀（如 '/admin'）
   * @param fullPath 完整路径（如 '/admin/users'）
   */
  setLastVisitedRoute: (modulePrefix: string, fullPath: string) => void
  /**
   * 获取模块的最后访问路由
   * @param modulePrefix 模块路径前缀
   * @param defaultPath 默认路径（当没有记录时返回）
   */
  getLastVisitedRoute: (modulePrefix: string, defaultPath: string) => string
}

/** 初始状态 */
const initialState: NavigationState = {
  activeType: null,
  activeId: null,
  userNavExpanded: false,
  lastVisitedRoutes: {}
}

/**
 * 导航状态 Store
 *
 * 使用 persist 中间件将状态持久化到 localStorage，
 * 这样页面刷新后可以恢复之前的导航状态。
 *
 * 持久化的内容：
 * - userNavExpanded: 用户导航展开状态
 * - lastVisitedRoutes: 每个模块最后访问的子路由
 */
export const useNavigationStore = create<NavigationState & NavigationActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      setActiveNav: (type, id) => set({ activeType: type, activeId: id }),
      clearActiveNav: () => set({ activeType: null, activeId: null }),
      toggleUserNav: () => set(state => ({ userNavExpanded: !state.userNavExpanded })),
      setUserNavExpanded: expanded => set({ userNavExpanded: expanded }),
      setLastVisitedRoute: (modulePrefix, fullPath) =>
        set(state => ({
          lastVisitedRoutes: {
            ...state.lastVisitedRoutes,
            [modulePrefix]: fullPath
          }
        })),
      getLastVisitedRoute: (modulePrefix, defaultPath) => {
        const routes = get().lastVisitedRoutes
        return routes[modulePrefix] || defaultPath
      }
    }),
    {
      name: 'navigation-storage',
      // 持久化用户导航展开状态和最后访问的路由
      partialize: state => ({
        userNavExpanded: state.userNavExpanded,
        lastVisitedRoutes: state.lastVisitedRoutes
      })
    }
  )
)
