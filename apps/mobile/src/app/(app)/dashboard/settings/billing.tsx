import { Pressable, ScrollView, Text, View } from 'react-native'

import { getBillingPlans, getCurrentMobileBillingProvider } from '@libs/billing'
import { useCustomer, usePaywall } from '@libs/billing/mobile'

export default function BillingRoute() {
  const { entitlements, linkToPortal } = useCustomer()
  const { present, result } = usePaywall()
  const plans = getBillingPlans()
  const activeEntitlement = entitlements.find(item => item.active)

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Text selectable style={{ fontSize: 28, fontWeight: '700' }}>
          Billing
        </Text>
        <Text selectable style={{ color: '#666' }}>
          当前 provider: {getCurrentMobileBillingProvider()}
        </Text>
        <Text selectable style={{ color: '#666' }}>
          当前 paywall 结果: {result}
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
          当前权益
        </Text>
        <Text selectable>
          {activeEntitlement ? `${activeEntitlement.id} / ${activeEntitlement.variantId}` : 'free'}
        </Text>
      </View>

      {plans.map(plan => (
        <View
          key={plan.id}
          style={{
            gap: 12,
            borderWidth: 1,
            borderColor: '#e4e4e7',
            borderRadius: 18,
            padding: 16
          }}
        >
          <Text selectable style={{ fontSize: 20, fontWeight: '600' }}>
            {plan.id}
          </Text>
          <Text selectable style={{ color: '#666' }}>
            {plan.description}
          </Text>
          {plan.variants.map(variant => (
            <Pressable
              key={variant.id}
              onPress={() => {
                void present({ trigger: variant.id })
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: variant.custom ? '#f4f4f5' : '#111'
              }}
            >
              <Text
                selectable
                style={{ color: variant.custom ? '#111' : '#fff', textAlign: 'center', fontWeight: '600' }}
              >
                {variant.id}
              </Text>
            </Pressable>
          ))}
        </View>
      ))}

      <Pressable
        onPress={() => {
          void linkToPortal({ store: getCurrentMobileBillingProvider() })
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
          打开 Billing Portal
        </Text>
      </Pressable>
    </ScrollView>
  )
}
