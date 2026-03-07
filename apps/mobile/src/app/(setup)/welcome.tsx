import { Link } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'

export default function WelcomeRoute() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 24 }}>
      <View style={{ gap: 12 }}>
        <Text selectable style={{ fontSize: 32, fontWeight: '700' }}>
          Ray Mobile
        </Text>
        <Text selectable style={{ fontSize: 16, color: '#666' }}>
          精简业务版移动端入口，当前包含 setup、dashboard、billing 三条主链。
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <Link
          href="/auth/login"
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
          登录
        </Link>

        <Link
          href="/auth/register"
          style={{
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#d4d4d8',
            textAlign: 'center',
            overflow: 'hidden'
          }}
        >
          注册
        </Link>
      </View>
    </ScrollView>
  )
}
