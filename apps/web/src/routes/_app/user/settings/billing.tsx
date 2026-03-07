import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { billingConfig, BillingSubscriptionStatus } from '@libs/billing'
import { useTranslation } from '@libs/i18n'
import { billing, PageHeader, PageHeaderDescription, PageHeaderTitle } from '@libs/studio'
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@libs/ui-shared/web'

export const Route = createFileRoute('/_app/user/settings/billing')({
  component: BillingPage
})

function BillingPage() {
  const { t } = useTranslation('billing')
  const summaryQuery = useQuery(billing.queries.summary.get)
  const checkoutMutation = useMutation({
    ...billing.mutations.checkout,
    onSuccess: result => {
      if (result.url) {
        window.location.assign(result.url)
      }
    }
  })
  const portalMutation = useMutation({
    ...billing.mutations.portal,
    onSuccess: result => {
      window.location.assign(result.url)
    }
  })

  const activeSubscription = summaryQuery.data?.subscriptions.find(subscription =>
    [BillingSubscriptionStatus.ACTIVE, BillingSubscriptionStatus.TRIALING].includes(subscription.status)
  )

  const currentUrl =
    typeof window === 'undefined' ? 'http://localhost:3000/user/settings/billing' : window.location.href

  const handleCheckout = (variantId: string) => {
    checkoutMutation.mutate({
      variantId,
      successUrl: currentUrl,
      cancelUrl: currentUrl
    })
  }

  const handleOpenPortal = () => {
    portalMutation.mutate({
      returnUrl: currentUrl
    })
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader>
        <div className="flex flex-col gap-1.5">
          <PageHeaderTitle>{t('title')}</PageHeaderTitle>
          <PageHeaderDescription>{t('description')}</PageHeaderDescription>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>{t('overview.title', { defaultValue: 'Billing Overview' })}</CardTitle>
          <CardDescription>
            {t('overview.description', { defaultValue: '查看当前订阅、订单与 customer 同步状态。' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">
              {t('overview.customers', { defaultValue: 'Customers' })}
            </div>
            <div className="text-2xl font-semibold">{summaryQuery.data?.customers.length ?? 0}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">
              {t('overview.subscriptions', { defaultValue: 'Subscriptions' })}
            </div>
            <div className="text-2xl font-semibold">{summaryQuery.data?.subscriptions.length ?? 0}</div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground">{t('overview.orders', { defaultValue: 'Orders' })}</div>
            <div className="text-2xl font-semibold">{summaryQuery.data?.orders.length ?? 0}</div>
          </div>
        </CardContent>
        <CardFooter className="justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {activeSubscription
              ? t('overview.activePlan', {
                  defaultValue: `当前订阅：${activeSubscription.planId} / ${activeSubscription.variantId}`
                })
              : t('overview.noActivePlan', { defaultValue: '当前没有激活中的订阅。' })}
          </div>
          <Button onClick={handleOpenPortal} disabled={portalMutation.isPending}>
            {t('portal.open', { defaultValue: '打开 Billing Portal' })}
          </Button>
        </CardFooter>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {billingConfig.plans.map(plan => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle>{t(plan.name, { defaultValue: plan.id })}</CardTitle>
              <CardDescription>{t(plan.description, { defaultValue: plan.description })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.features.map(feature => (
                <div key={feature} className="text-sm text-muted-foreground">
                  {t(feature, { defaultValue: feature })}
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-2">
              {plan.variants.map(variant => (
                <Button
                  key={variant.id}
                  variant={variant.custom ? 'outline' : 'default'}
                  onClick={() => handleCheckout(variant.id)}
                  disabled={checkoutMutation.isPending || Boolean(variant.custom) || !variant.stripePriceId}
                >
                  {variant.label ? t(variant.label, { defaultValue: variant.label }) : variant.id}
                </Button>
              ))}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
