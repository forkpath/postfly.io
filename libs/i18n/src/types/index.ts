export const Locale = {
  EN: 'en',
  ZH: 'zh'
} as const

export type Locale = (typeof Locale)[keyof typeof Locale]

export const LocaleLabel: Record<Locale, string> = {
  [Locale.EN]: 'English',
  [Locale.ZH]: '中文'
} as const

export type { TFunction } from 'i18next'
