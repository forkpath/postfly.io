import type { InitOptions, Namespace } from 'i18next'

import { env } from './env'

export const config = {
  locales: ['en', 'zh'],
  defaultLocale: env.VITE_DEFAULT_LOCALE,
  namespaces: ['common', 'admin', 'organization', 'dashboard', 'auth', 'billing', 'marketing', 'validation'],
  cookie: 'locale'
} as const

export const getInitOptions = ({
  locale,
  defaultLocale,
  ns
}: {
  locale?: string
  defaultLocale?: string
  ns?: Namespace
}): InitOptions => ({
  // 支持的语言与默认回退语言
  supportedLngs: config.locales,
  fallbackLng: defaultLocale ?? config.defaultLocale,
  lng: locale,
  // 命名空间统一管理，避免漏加载
  defaultNS: config.namespaces,
  fallbackNS: config.namespaces,
  ns: ns ?? config.namespaces,
  preload: false,
  interpolation: {
    escapeValue: false
  },
  missingInterpolationHandler: (text, value, options) => {
    console.debug(`Missing interpolation value for key: ${text}`, value, options)
  }
})
