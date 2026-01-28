import type { Item, Menu } from './types'

import { useCallback, useEffect, useState } from 'react'
import { useLocation } from '@tanstack/react-router'

import { ROOT_MENU_HREF } from './types'

const flattenItems = (menu: Menu) => menu.flatMap(group => group.items)

const findNodeByHref = (menu: Menu, href: string) => {
  if (href === ROOT_MENU_HREF) {
    return null
  }

  const stack = [{ items: flattenItems(menu), parentHref: ROOT_MENU_HREF }]

  while (stack.length > 0) {
    const { items, parentHref } = stack.pop()!

    for (const item of items) {
      if (item.href === href) {
        return { item, parentHref }
      }

      if (item.menu) {
        stack.push({
          items: flattenItems(item.menu),
          parentHref: item.href
        })
      }
    }
  }

  return null
}

export const useMenu = (menu: Menu) => {
  const [history, setHistory] = useState<{
    previous: string
    next: string | null
  }>({
    previous: ROOT_MENU_HREF,
    next: null
  })
  const [currentHref, setCurrentHref] = useState(ROOT_MENU_HREF)
  const location = useLocation()
  const pathname = location.pathname

  const findItemByHref = useCallback((href: string) => findNodeByHref(menu, href)?.item ?? null, [menu])

  const findParentByHref = useCallback((href: string) => findNodeByHref(menu, href)?.parentHref ?? null, [menu])

  const onBack = useCallback(() => {
    const parent = findParentByHref(currentHref) ?? ROOT_MENU_HREF

    setHistory({
      previous: parent,
      next: currentHref
    })
    setTimeout(() => {
      setCurrentHref(parent)
    })
  }, [findParentByHref, currentHref])

  const onForward = useCallback(
    (href: string) => {
      setHistory({
        previous: currentHref,
        next: href
      })
      setTimeout(() => {
        setCurrentHref(href)
      })
    },
    [currentHref]
  )

  const isActive = useCallback(
    (item: Item) => {
      function hasActive(item: Item): boolean {
        if (item.menu) {
          return item.menu.some(group => group.items.some(child => hasActive(child)))
        } else {
          const exact = item.exact ?? true
          return exact ? pathname === item.href : pathname.startsWith(item.href)
        }
      }
      return hasActive(item)
    },
    [pathname]
  )

  useEffect(() => {
    const item = findItemByHref(pathname)
    const parentHref = findParentByHref(pathname)
    const parentItem = parentHref ? findItemByHref(parentHref) : null

    setHistory({
      previous: parentHref ?? ROOT_MENU_HREF,
      next: item?.href ?? null
    })
    setCurrentHref((item?.menu ? item.href : parentItem?.href) ?? ROOT_MENU_HREF)
  }, [pathname, findItemByHref, findParentByHref])

  return {
    isActive,
    history,
    onBack,
    onForward,
    currentHref,
    findItemByHref,
    findParentByHref
  }
}
