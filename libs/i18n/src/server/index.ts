/**
 * negotiator用来解析Header中的
 * Accept/Accept-Language/Accept-Encoding/Accept-Charset这些字段，用来判断客户端语言偏好
 * const negotiator = new Negotiator(req)
 * const languages = negotiator.languages() // => ['zh-CN', 'zh', 'en-US', 'en']
 *
 * @formatjs/intl-localematcher实现了ECMA-402/ICU的locale matching算法
 * 它主要作用是：在「客户端语言偏好」和「服务器支持语言」之间做最佳匹配
 *
 * const locales = ['en', 'en-GB', 'zh-CN'];
 * const languages = ['zh-TW', 'zh', 'en-US'];
 * const locale = match(languages, locales, 'en'); // => 'zh-CN'
 */
import type { i18n, Namespace, TFunction } from 'i18next'

import { match } from '@formatjs/intl-localematcher'
import dayjs from 'dayjs'
import { createInstance } from 'i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import Negotiator from 'negotiator'
import { initReactI18next } from 'react-i18next/initReactI18next'
import * as z from 'zod'

import { config, getInitOptions } from '../config'
import { env } from '../env'
import { loadTranslation, makeZodI18nMap } from '../utils'

const initializeI18nServer = async ({
  locale,
  defaultLocale,
  ns
}: {
  locale?: string
  defaultLocale?: string
  ns?: Namespace
}): Promise<i18n> => {
  const i18n = createInstance()
  const loadedNamespaces = new Set<string>()

  await new Promise(resolve => {
    void i18n
      .use(
        resourcesToBackend(
          async (
            language: (typeof config.locales)[number],
            namespace: (typeof config.namespaces)[number],
            callback
          ) => {
            const data = await loadTranslation(language, namespace)

            loadedNamespaces.add(namespace)
            return callback(null, data)
          }
        )
      )
      .use({
        type: '3rdParty',
        init: async (i18next: typeof i18n) => {
          let iterations = 0
          const maxIterations = 100

          while (i18next.isInitializing) {
            iterations++

            if (iterations > maxIterations) {
              console.error(`i18next is not initialized after ${maxIterations} iterations`)

              break
            }

            await new Promise(resolve => setTimeout(resolve, 1))
          }

          // SSR 下显式初始化 react-i18next
          initReactI18next.init(i18next)
          resolve(i18next)
        }
      })
      .init(getInitOptions({ locale, defaultLocale, ns }))
  })

  const namespaces = ns ? (typeof ns === 'string' ? [ns] : ns) : config.namespaces

  // If all namespaces are already loaded, return the i18n instance
  if (loadedNamespaces.size === namespaces.length) {
    return i18n
  }

  // Otherwise, wait for all namespaces to be loaded

  const maxWaitTimeMs = 100
  const checkIntervalMs = 5

  async function waitForNamespaces() {
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTimeMs) {
      const allNamespacesLoaded = namespaces.every(ns => loadedNamespaces.has(ns))

      if (allNamespacesLoaded) {
        return true
      }

      await new Promise(resolve => setTimeout(resolve, checkIntervalMs))
    }

    return false
  }

  const success = await waitForNamespaces()

  if (!success) {
    console.warn(`Not all namespaces were loaded after ${maxWaitTimeMs}ms. Initialization may be incomplete.`)
  }

  return i18n
}

export const getLocaleFromRequest = (request?: Request) => {
  if (!request) return env.DEFAULT_LOCALE ?? config.defaultLocale

  // 优先读取 cookie 中保存的语言
  const localeCookie = request.headers
    .get('cookie')
    ?.split(';')
    .find(cookie => cookie.trim().startsWith(`${config.cookie}=`))
    ?.split('=')[1]
    ?.trim()
    .replace(/[.,]/g, '')

  if (localeCookie) {
    return localeCookie
  }

  const negotiatorHeaders: Record<string, string> = {}
  request.headers.forEach((value: string, key: string) => {
    negotiatorHeaders[key] = value
  })

  // 基于 Accept-Language 做协商匹配
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages()

  try {
    return match(languages, config.locales, env.DEFAULT_LOCALE ?? config.defaultLocale)
  } catch {
    return env.DEFAULT_LOCALE ?? config.defaultLocale
  }
}

export const getTranslation = async <T extends Namespace>({
  locale: passedLocale,
  request,
  ns
}: { locale?: string; request?: Request; ns?: T } = {}) => {
  // 优先使用显式 locale，其次从 request 推断
  const locale =
    passedLocale ?? (request ? getLocaleFromRequest(request) : undefined) ?? env.DEFAULT_LOCALE ?? config.defaultLocale
  const i18nextInstance = await initializeI18nServer({ locale, ns })
  dayjs.locale(i18nextInstance.language)

  const t = i18nextInstance.getFixedT<T>(i18nextInstance.language, ns) as TFunction<T>

  z.config({
    localeError: makeZodI18nMap({ t: t as TFunction })
  })

  return {
    t,
    i18n: i18nextInstance
  }
}
