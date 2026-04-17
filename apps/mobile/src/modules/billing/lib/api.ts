import { api } from '~/lib/api'

import { billingMutations, billingQueries } from '@libs/api-client'

const queries = {
  summary: {
    get: billingQueries.summary(api)
  }
} as const

const mutations = {
  portal: billingMutations.portal.options(api),
  checkout: billingMutations.checkout.options(api)
} as const

export const billing = {
  queries,
  mutations
}
