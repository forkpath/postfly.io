import { mutationOptions, queryOptions } from '@tanstack/react-query'

const KEY = 'billing'

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  })

  if (!response.ok) {
    throw new Error(`Billing request failed: ${response.status}`)
  }

  const payload = (await response.json()) as { data?: T } | T

  if ('data' in (payload as { data?: T })) {
    return (payload as { data?: T }).data as T
  }

  return payload as T
}

const queries = {
  summary: {
    get: queryOptions({
      queryKey: [KEY, 'me'],
      queryFn: () => request('/api/billing/me')
    })
  }
}

const mutations = {
  checkout: mutationOptions({
    mutationKey: [KEY, 'checkout'],
    mutationFn: (input: { variantId: string; successUrl: string; cancelUrl: string }) =>
      request<{ provider: 'stripe'; url: string | null }>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify(input)
      })
  }),
  portal: mutationOptions({
    mutationKey: [KEY, 'portal'],
    mutationFn: (input: { returnUrl: string }) =>
      request<{ provider: 'stripe'; url: string }>('/api/billing/portal', {
        method: 'POST',
        body: JSON.stringify(input)
      })
  })
}

export const billing = {
  queries,
  mutations
} as const
