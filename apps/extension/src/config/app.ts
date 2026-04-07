import type { ThemeColor, ThemeMode } from '@libs/ui-shared/common'

export const appConfig = {
  name: (import.meta.env.VITE_PRODUCT_NAME as string) ?? 'Ray',
  url: (import.meta.env.VITE_SITE_URL as string) ?? 'http://localhost:3000',
  locale: (import.meta.env.VITE_DEFAULT_LOCALE as string) ?? 'en',
  theme: {
    mode: ((import.meta.env.VITE_THEME_MODE as string) ?? 'system') as ThemeMode,
    color: ((import.meta.env.VITE_THEME_COLOR as string) ?? 'orange') as ThemeColor
  }
} as const
