import { authConfigSchema, AuthProvider } from './auth-contract'

describe('auth contract', () => {
  it('accepts a complete provider configuration', () => {
    expect(
      authConfigSchema.parse({
        providers: {
          password: true,
          magicLink: true,
          emailOtp: true,
          anonymous: false,
          passkey: true,
          oAuth: ['google']
        }
      })
    ).toEqual({
      providers: {
        password: true,
        magicLink: true,
        emailOtp: true,
        anonymous: false,
        passkey: true,
        oAuth: ['google']
      }
    })
  })

  it('exposes password as a transport-neutral provider', () => {
    expect(AuthProvider.PASSWORD).toBe('password')
  })
})
