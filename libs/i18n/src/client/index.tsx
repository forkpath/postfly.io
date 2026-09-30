import type { FlatNamespace, i18n, Namespace, TFunction, TOptions } from 'i18next'
import type { UseTranslationOptions } from 'react-i18next'

import { useEffect, useState } from 'react'

import dayjs from 'dayjs'
import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import resourcesToBackend from 'i18next-resources-to-backend'
import { I18nextProvider, initReactI18next, useTranslation as useTranslationBase } from 'react-i18next'
import * as z from 'zod'

import { config, getInitOptions } from '../config'
import { loadTranslation, makeZodI18nMap } from '../utils'

// 简化的翻译函数类型，允许字符串键
type TranslateFunction<Ns extends FlatNamespace | FlatNamespace[] | undefined = undefined> = {
  (key: string, options?: TOptions): string
  <K extends string>(key: K, options?: TOptions): string
} & TFunction<Ns extends undefined ? 'common' : Ns>

let client: i18n | null = null

let iteration = 0
const MAX_ITERATIONS = 20

// 初始化 i18n（动态加载语言包），用于浏览器端渲染
const initializeI18nClient = async ({
  locale,
  defaultLocale,
  ns
}: {
  locale?: string
  defaultLocale?: string
  ns?: Namespace
} = {}) => {
  if (client) {
    return client
  }

  const loadedLanguages = new Set<string>()
  const loadedNamespaces = new Set<string>()
  const i18n = i18next.createInstance()

  await i18n
    .use(initReactI18next)
    .use(initReactI18next)
    .use(
      resourcesToBackend(
        async (language: (typeof config.locales)[number], namespace: (typeof config.namespaces)[number], callback) => {
          // 客户端按需加载语言包，减少首屏体积
          const data = await loadTranslation(language, namespace)

          if (!loadedLanguages.has(language)) {
            loadedLanguages.add(language)
          }

          if (!loadedNamespaces.has(namespace)) {
            loadedNamespaces.add(namespace)
          }

          return callback(null, data)
        }
      )
    )
    .use(LanguageDetector)
    .init(
      {
        ...getInitOptions({
          locale,
          defaultLocale,
          ns
        }),
        detection: {
          order: ['htmlTag', 'cookie', 'navigator'],
          caches: ['cookie'],
          lookupCookie: config.cookie
        }
      },
      err => {
        if (err) {
          console.error('Error initializing i18n client', err)
        }
      }
    )

  if (iteration >= MAX_ITERATIONS) {
    console.debug(`Max iterations reached: ${MAX_ITERATIONS}`)

    client = i18n
    return client
  }

  if (loadedLanguages.size === 0 || loadedNamespaces.size === 0) {
    iteration++

    console.debug(
      `Keeping component from rendering if no languages or namespaces are loaded. Iteration: ${iteration}. Will stop after ${MAX_ITERATIONS} iterations.`
    )

    // 通过抛错阻止渲染，等待异步资源加载
    throw new Error('No languages or namespaces loaded')
  }

  client = i18n
  return client
}

// 客户端：React Hook，用于组件内获取 t 函数
export const useTranslation = <Ns extends FlatNamespace | FlatNamespace[] | undefined = undefined>(
  ns?: Ns,
  options?: UseTranslationOptions<undefined>
) => {
  const result = useTranslationBase(ns, options)
  return {
    ...result,
    t: result.t as unknown as TranslateFunction<Ns>
  }
}

// 客户端：获取或初始化 i18n 实例，适用于非组件场景
export const getI18n = async ({
  locale,
  defaultLocale,
  ns
}: {
  locale?: string
  defaultLocale?: string
  ns?: Namespace
}) => {
  if (!client) {
    return initializeI18nClient({ locale, defaultLocale, ns })
  }

  const t = client.getFixedT<Namespace>(client.language, ns)

  await client.changeLanguage(locale)
  dayjs.locale(locale)
  z.config({
    localeError: makeZodI18nMap({ t: t as TFunction })
  })

  if (ns) {
    await client.loadNamespaces(ns)
  }
  return client
}

// 客户端：Provider 包装组件树，支持语言切换与资源加载
export const I18nProvider = ({
  children,
  locale,
  defaultLocale,
  ns
}: {
  children: React.ReactNode
  locale?: string
  defaultLocale?: string
  ns?: Namespace
}) => {
  const [i18nClient, setI18nClient] = useState<i18n | null>(client)

  useEffect(() => {
    void (async () => {
      if (!client) {
        setI18nClient(await getI18n({ locale, defaultLocale, ns }))
      }
    })()
  }, [client])

  useEffect(() => {
    if (i18nClient) {
      void i18nClient.changeLanguage(locale)
    }
  }, [locale])

  if (!i18nClient) {
    return null
  }

  const t = i18nClient.getFixedT<Namespace>(i18nClient.language, ns)

  z.config({
    localeError: makeZodI18nMap({ t: t as TFunction })
  })

  dayjs.locale(locale)

  return <I18nextProvider i18n={i18nClient}>{children}</I18nextProvider>
}

export type { ParseKeys as TranslationKey } from 'i18next'
