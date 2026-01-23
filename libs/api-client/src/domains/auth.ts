// libs/api-client/src/lib/domains/auth.ts
import type { AuthTokenRes, LoginReq, RegisterReq } from '@libs/payload'

import { loginReqSchema, registerReqSchema } from '@libs/payload'

import { createMutationFactory } from '../lib/queries/factory'

// ==================== Keys ====================

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const
} as const

// ==================== Mutations ====================

export const authMutations = {
  /** 登录 */
  login: createMutationFactory<AuthTokenRes, Error, LoginReq>((api, data) => {
    const validated = loginReqSchema.parse(data) // ← 输入验证，验证失败会抛出ZodError
    return api.post('/auth/login', validated)
  }),

  /** 注册 */
  register: createMutationFactory<AuthTokenRes, Error, RegisterReq>((api, data) => {
    const validated = registerReqSchema.parse(data)
    return api.post('/auth/register', validated)
  }),

  /** 登出 */
  logout: createMutationFactory<void, Error, void>(api => api.post('/auth/logout'))
}
