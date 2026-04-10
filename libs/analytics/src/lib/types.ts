import type { ReactNode } from 'react'

export type AllowedPropertyValues = string | number | boolean

export type AnalyticsProviderName = 'google-analytics' | 'posthog'

export type AnalyticsTrackPayload = Record<string, AllowedPropertyValues> & {
  clientId?: string
  distinctId?: string
}

/**
 * track(event, properties?)
 * 记录一条“事件行为”。
 * 例子：track("button_clicked", { button: "upgrade" })。

 * identify(userId, traits?)
 * 把当前匿名会话绑定到某个用户 ID，并可附带用户属性。
 * 例子：identify("user_123", { email: "a@b.com", name: "Tom" })。
 * 作用是让后续事件归到这个用户下，并支持用户维度分析。
 
 * reset()
 * 清空当前客户端身份状态（退出登录常用）。
 * 通常会断开已识别用户，回到匿名状态，避免后续事件继续记到上一个用户。
 */

export interface AnalyticsProviderClientStrategy {
  Provider: ({ children }: { children: ReactNode }) => ReactNode
  track: (event: string, data?: AnalyticsTrackPayload) => void
  identify: (userId: string, traits?: Record<string, AllowedPropertyValues>) => void
  reset: () => void
}

export interface AnalyticsProviderServerStrategy {
  track: (event: string, data?: AnalyticsTrackPayload) => void
}

export const AnalyticsProvider = {
  POSTHOG: 'posthog',
  GOOGLE_ANALYTICS: 'google-analytics'
} as const satisfies Record<string, AnalyticsProviderName>
