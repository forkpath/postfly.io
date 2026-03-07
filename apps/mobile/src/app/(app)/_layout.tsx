import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="dashboard/index" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="dashboard/settings/billing" options={{ title: 'Billing' }} />
    </Stack>
  )
}
