import type { AppStateStatus } from 'react-native'

import { useEffect } from 'react'
import { focusManager } from '@tanstack/react-query'

import { AppState, Platform } from 'react-native'

export function useRefetchOnAppFocus() {
  useEffect(() => {
    const onAppStateChange = (status: AppStateStatus) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active')
      }
    }

    const subscription = AppState.addEventListener('change', onAppStateChange)

    return () => subscription.remove()
  }, [])
}
