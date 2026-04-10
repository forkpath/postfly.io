import env from '../../env'

export const appConfig = {
  name: env.VITE_PRODUCT_NAME,
  apiBaseUrl: env.VITE_API_BASE_URL,
  url: env.VITE_URL,
  locale: env.VITE_DEFAULT_LOCALE,
  theme: {
    mode: env.VITE_THEME_MODE,
    color: env.VITE_THEME_COLOR
  }
} as const
