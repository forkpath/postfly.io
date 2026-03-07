import { Providers } from '~/lib/providers'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function RootLayout() {
  return (
    <Providers>
      <StatusBar style="auto" />
      <Stack />
    </Providers>
  )
}
