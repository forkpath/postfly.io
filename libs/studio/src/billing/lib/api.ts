import { queryOptions } from '@tanstack/react-query'

const KEY = 'billing'

// Placeholder billing API - to be implemented with actual API client
const queries = {
  summary: {
    get: queryOptions({
      queryKey: [KEY, 'me'],
      queryFn: async () => {
        // Placeholder - implement with actual API client
        return {
          subscriptions: [],
          orders: []
        }
      }
    })
  }
}

const mutations = {
  // Placeholder mutations - to be implemented with actual API client
}

export const billing = {
  queries,
  mutations
} as const
