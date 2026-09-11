import type { ApiClient } from '../lib/client'
import type { BillingOwner } from '@libs/billing-contract'
import type {
  BillingOrderRes,
  BillingPortalRedirectRes,
  BillingPortalReq,
  BillingRedirectRes,
  BillingSubscriptionRes,
  BillingSummaryCustomerRes,
  BillingSummaryRes,
  CheckoutReq
} from '@libs/payload'

import {
  billingPortalRedirectResSchema,
  billingPortalReqSchema,
  billingRedirectResSchema,
  billingSummaryResSchema,
  checkoutReqSchema
} from '@libs/payload'

import {
  createMutationFactory,
  createMutationWithParamsFactory,
  createQueryOptionsFactory
} from '../lib/queries/factory'

export type BillingCustomer = BillingSummaryCustomerRes
export type BillingSubscription = BillingSubscriptionRes
export type BillingOrder = BillingOrderRes
export type BillingSummaryCustomer = BillingSummaryCustomerRes
export type BillingSummary = BillingSummaryRes

export const billingKeys = {
  all: ['billing'] as const,
  summary: (owner: BillingOwner) =>
    [...billingKeys.all, 'summary', owner.kind, owner.kind === 'user' ? owner.userId : owner.organizationId] as const
} as const

export const billingQueries = {
  summary: (api: ApiClient, owner: BillingOwner = { kind: 'user', userId: 'me' }) =>
    createQueryOptionsFactory<BillingSummary, Error, BillingSummary>(client => ({
      queryKey: billingKeys.summary(owner),
      queryFn: async () => {
        const response =
          owner.kind === 'user'
            ? await client.get<unknown>('/billing/me')
            : await client.get<unknown>(`/organizations/${owner.organizationId}/billing`)
        return billingSummaryResSchema.parse(response)
      }
    }))(api)
}

export const billingMutations = {
  checkout: createMutationFactory<BillingRedirectRes, Error, CheckoutReq>(async (api, data) =>
    billingRedirectResSchema.parse(await api.post<unknown>('/billing/checkout', checkoutReqSchema.parse(data)))
  ),
  portal: createMutationFactory<BillingPortalRedirectRes, Error, BillingPortalReq>(async (api, data) =>
    billingPortalRedirectResSchema.parse(await api.post<unknown>('/billing/portal', billingPortalReqSchema.parse(data)))
  ),
  organizationCheckout: createMutationWithParamsFactory<
    BillingRedirectRes,
    Error,
    CheckoutReq,
    { organizationId: string }
  >(async (api, data, { organizationId }) =>
    billingRedirectResSchema.parse(
      await api.post<unknown>(`/organizations/${organizationId}/billing/checkout`, checkoutReqSchema.parse(data))
    )
  ),
  organizationPortal: createMutationWithParamsFactory<
    BillingPortalRedirectRes,
    Error,
    BillingPortalReq,
    { organizationId: string }
  >(async (api, data, { organizationId }) =>
    billingPortalRedirectResSchema.parse(
      await api.post<unknown>(`/organizations/${organizationId}/billing/portal`, billingPortalReqSchema.parse(data))
    )
  )
}
