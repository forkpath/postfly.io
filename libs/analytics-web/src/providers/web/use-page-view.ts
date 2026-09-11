import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'

export function usePageView(onPageView: (path: string, url: string) => void) {
  const href = useRouterState({
    select: state => state.location.href
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    onPageView(href, window.location.href)
  }, [href, onPageView])
}
