import { authClient } from '~/lib/auth'
import { Link, router } from 'expo-router'
import { Pressable, ScrollView, Text, View } from 'react-native'

export default function DashboardRoute() {
  const session = authClient.useSession()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.replace('/welcome')
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 24 }}>
      <View style={{ gap: 8 }}>
        <Text selectable style={{ fontSize: 28, fontWeight: '700' }}>
          Dashboard
        </Text>
        <Text selectable style={{ color: '#666' }}>
          这是 `ray` 精简移动端首页，当前已接入 auth、analytics、monitoring、billing 四类基础能力。
        </Text>
      </View>

      <View
        style={{
          gap: 8,
          borderWidth: 1,
          borderColor: '#e4e4e7',
          borderRadius: 18,
          padding: 16
        }}
      >
        <Text selectable style={{ fontWeight: '600' }}>
          当前用户
        </Text>
        <Text selectable>ID: {session.data?.user.id ?? '未登录'}</Text>
        <Text selectable>Email: {session.data?.user.email ?? '未登录'}</Text>
        <Text selectable>Name: {session.data?.user.name ?? '未登录'}</Text>
      </View>

      <Link
        href="/dashboard/settings/billing"
        style={{
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 16,
          backgroundColor: '#111',
          color: '#fff',
          textAlign: 'center',
          overflow: 'hidden'
        }}
      >
        查看 Billing
      </Link>

      <Pressable
        onPress={() => {
          void handleSignOut()
        }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#d4d4d8'
        }}
      >
        <Text selectable style={{ textAlign: 'center', fontWeight: '600' }}>
          退出登录
        </Text>
      </Pressable>
    </ScrollView>
  )
}
