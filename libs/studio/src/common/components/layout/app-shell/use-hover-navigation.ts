import { useCallback, useEffect, useRef, useState } from 'react'

export interface HoverNavigation {
  openKey: string | number | null
  enter: (key: string | number) => void
  leave: () => void
  retain: () => void
  close: () => void
}

/** One menu can be open at a time; moving into its portal preserves it. */
export function useHoverNavigation(): HoverNavigation {
  const [openKey, setOpenKey] = useState<string | number | null>(null)
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retain = useCallback(() => {
    if (timeout.current !== null) clearTimeout(timeout.current)
    timeout.current = null
  }, [])
  useEffect(() => retain, [retain])

  const close = useCallback(() => {
    retain()
    setOpenKey(null)
  }, [retain])
  const enter = useCallback(
    (key: string | number) => {
      retain()
      if (openKey !== null) setOpenKey(key)
      else timeout.current = setTimeout(() => setOpenKey(key), 100)
    },
    [openKey, retain]
  )
  const leave = useCallback(() => {
    retain()
    timeout.current = setTimeout(close, 200)
  }, [close, retain])

  return { openKey, enter, leave, retain, close }
}
