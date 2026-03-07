import { Stack } from 'expo-router'

export default function SetupLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center'
      }}
    >
      <Stack.Screen name="welcome" options={{ title: '欢迎' }} />
      <Stack.Screen name="auth/login" options={{ title: '登录' }} />
      <Stack.Screen name="auth/register" options={{ title: '注册' }} />
    </Stack>
  )
}
