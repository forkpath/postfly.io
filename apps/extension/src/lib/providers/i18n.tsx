import { useEffect } from 'react'

import { appConfig } from '~/config/app'
import { useLocale } from '~/lib/i18n'

import { I18nProvider as I18nClientProvider } from '@libs/i18n'

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: locale, isLoading } = useLocale()

  useEffect(() => {
    if (locale) {
      document.documentElement.lang = locale
    }
  }, [locale])

  if (isLoading) return null

  return (
    <I18nClientProvider locale={locale} defaultLocale={appConfig.locale}>
      {children}
    </I18nClientProvider>
  )
}
