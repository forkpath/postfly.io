import type { CheckoutPayload, GetBillingPortalPayload } from '../schema'
import type { User } from '@libs/auth'

export interface WebhookCallbacks {
  onCheckoutSessionCompleted?: (sessionId: string) => Promise<void> | void
  onSubscriptionCreated?: (subscriptionId: string) => Promise<void> | void
  onSubscriptionUpdated?: (subscriptionId: string) => Promise<void> | void
  onSubscriptionDeleted?: (subscriptionId: string) => Promise<void> | void
  onEvent?: (event: unknown) => Promise<void> | void
}

export interface BillingProviderStrategy {
  provider: BillingProvider
  webhookHandler: (req: Request, callbacks?: WebhookCallbacks) => Promise<Response>
  checkout: (input: CheckoutPayload & { user: User }) => Promise<{ url: string | null }>
  getBillingPortal: (input: GetBillingPortalPayload & { user: User }) => Promise<{ url: string }>
}

export const BillingProvider = {
  STRIPE: 'stripe'
} as const

export type BillingProvider = (typeof BillingProvider)[keyof typeof BillingProvider]
