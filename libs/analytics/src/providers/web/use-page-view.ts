import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'

export function usePageView(onPageView: (path: string, url: string) => void) {
  const location = useRouterState({
    select: state => state.location
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const path = `${location.pathname}${location.search ?? ''}${location.hash ?? ''}`
    onPageView(path, window.location.href)
  }, [location.hash, location.pathname, location.search, onPageView])
}
