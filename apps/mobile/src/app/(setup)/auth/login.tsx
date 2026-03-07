import { useState } from 'react'

import { authClient } from '~/lib/auth'
import { router } from 'expo-router'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'

import { passwordLoginSchema } from '@libs/auth'
import { captureException } from '@libs/monitoring/mobile'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return '登录失败，请稍后重试'
}

export default function LoginRoute() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async () => {
    const parsed = passwordLoginSchema.safeParse({
      email,
      password,
      rememberMe: true
    })

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? '请输入正确的邮箱和密码')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      await authClient.signIn.email({
        ...parsed.data,
        callbackURL: 'ray-mobile://dashboard'
      })
      router.replace('/dashboard')
    } catch (error) {
      captureException(error, { scope: 'mobile-login' })
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Text selectable style={{ fontSize: 28, fontWeight: '700' }}>
          登录
        </Text>
        <Text selectable style={{ color: '#666' }}>
          使用 Ray 当前的 Better Auth 移动端 client 登录。
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="邮箱"
          value={email}
          onChangeText={setEmail}
          style={{
            borderWidth: 1,
            borderColor: '#d4d4d8',
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12
          }}
        />
        <TextInput
          autoCapitalize="none"
          autoComplete="password"
          placeholder="密码"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{
            borderWidth: 1,
            borderColor: '#d4d4d8',
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12
          }}
        />
      </View>

      {errorMessage ? (
        <Text selectable style={{ color: '#dc2626' }}>
          {errorMessage}
        </Text>
      ) : null}

      <Pressable
        onPress={() => {
          void handleSubmit()
        }}
        disabled={isSubmitting}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderRadius: 16,
          backgroundColor: '#111',
          opacity: isSubmitting ? 0.6 : 1
        }}
      >
        <Text selectable style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>
          {isSubmitting ? '登录中...' : '继续登录'}
        </Text>
      </Pressable>
    </ScrollView>
  )
}
