// Client
export { createClient, detectRuntime } from './lib/client'

// Context & Hooks
export { ApiClientProvider, useApiClient, useApiClientContext, useApiRuntime } from './lib/context'

// Query Client
export { createQueryClient, getErrorMessage, getQueryClient } from './lib/query-client'

// Query & Mutation utilities
export {
  // Factory functions - Query
  createQueryOptionsFactory,
  createQueryOptionsWithParams,
  // Factory functions - Mutation
  createMutationFactory,
  createMutationWithParamsFactory,
  // Factory functions - Keys
  createKeys
} from './lib/queries'
export type { KeyFactory, MutationOptionsWithoutFn } from './lib/queries'

// Wrapped hooks
export { useMutationWithClient } from './lib/hooks/use-mutation-with-client'
export { useQueryWithClient } from './lib/hooks/use-query-with-client'
export type { QueryFunctionContextWithClient } from './lib/hooks/use-query-with-client'

// Types
export type { ApiClientContextValue, ApiClientOptions, ApiRuntime, AuthOptions } from './lib/types'
export type { ApiClientProviderProps } from './lib/context'
export type { MutationErrorContext, QueryClientOptions, QueryErrorContext } from './lib/query-client'

// Domains
export { authKeys, authMutations, billingKeys, billingMutations, billingQueries, orgKeys, userKeys } from './domains'
