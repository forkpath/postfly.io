/**
 * 统一的二级导航配置类型
 *
 * 设计原则：
 * - 导航数据只定义一次，由各个模块导出配置函数
 * - 渲染逻辑由通用组件处理，根据显示模式自动选择合适的 UI
 * - 支持统计卡片、进度指示器、快捷入口、分组导航等多种元素
 */

import type { ReactNode } from 'react'

// ============================================================================
// 基础类型
// ============================================================================

/**
 * 导航项
 * 所有导航元素的基础单位
 */
export interface NavItem {
  /** 显示标签（已翻译的文本） */
  label: string
  /** 跳转路径 */
  href: string
  /** 图标元素 */
  icon: ReactNode
}

/**
 * 导航分组
 * 将多个导航项组织在一起，可选标题
 */
export interface NavGroup {
  /** 分组标题（可选） */
  title?: string
  /** 分组内的导航项 */
  items: NavItem[]
}

/**
 * 统计卡片
 * 用于在二级导航顶部显示关键指标
 */
export interface NavStatCard {
  /** 指标标签 */
  label: string
  /** 指标值 */
  value: string | number
  /** 变化趋势（可选） */
  trend?: {
    value: number
    direction: 'up' | 'down' | 'neutral'
  }
}

/**
 * 进度指示器
 * 用于显示目标进度
 */
export interface NavProgress {
  /** 进度标签 */
  label: string
  /** 进度值（0-100） */
  value: number
  /** 进度描述（可选） */
  description?: string
}

// ============================================================================
// 二级导航配置
// ============================================================================

/**
 * 二级导航配置
 *
 * 统一的配置结构，支持多种 UI 元素：
 * - stats: 统计卡片（网格显示）
 * - progress: 进度指示器
 * - quickAccess: 快捷入口（网格显示）
 * - groups: 分组导航列表
 *
 * @example
 * ```tsx
 * const crmNavConfig: SecondaryNavConfig = {
 *   title: 'CRM',
 *   stats: [
 *     { label: 'Deliveries', value: '25.9k' },
 *     { label: 'On the way', value: '4.6k' }
 *   ],
 *   quickAccess: [
 *     { label: 'Dashboard', href: '/crm', icon: <DashboardIcon /> }
 *   ],
 *   groups: [
 *     {
 *       title: 'Clients',
 *       items: [
 *         { label: 'Accounts', href: '/crm/accounts', icon: <UsersIcon /> }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export interface SecondaryNavConfig {
  /** 导航标题（用于移动端折叠菜单） */
  title?: string
  /** 统计卡片列表（可选） */
  stats?: NavStatCard[]
  /** 进度指示器（可选） */
  progress?: NavProgress
  /** 快捷入口列表（网格显示，可选） */
  quickAccess?: NavItem[]
  /** 导航分组列表 */
  groups: NavGroup[]
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 将二级导航配置扁平化为导航项列表
 * 用于移动端/折叠模式的简化显示
 *
 * @param config 二级导航配置
 * @returns 扁平化的导航项列表
 */
export function flattenNavConfig(config: SecondaryNavConfig): NavItem[] {
  const items: NavItem[] = []

  // 添加快捷入口
  if (config.quickAccess) {
    items.push(...config.quickAccess)
  }

  // 添加分组中的所有项
  for (const group of config.groups) {
    items.push(...group.items)
  }

  return items
}

/**
 * 从二级导航配置中获取默认子路由
 * 优先返回第一个快捷入口，否则返回第一个分组的第一项
 *
 * @param config 二级导航配置
 * @returns 默认子路由路径，如果没有则返回 undefined
 */
export function getDefaultSubRoute(config: SecondaryNavConfig): string | undefined {
  if (config.quickAccess && config.quickAccess.length > 0) {
    return config.quickAccess[0].href
  }

  if (config.groups.length > 0 && config.groups[0].items.length > 0) {
    return config.groups[0].items[0].href
  }

  return undefined
}
