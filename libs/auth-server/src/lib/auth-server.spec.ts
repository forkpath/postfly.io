import { auth } from './auth-server'

const requiredPluginIds = [
  'magic-link',
  'email-otp',
  'passkey',
  'two-factor',
  'anonymous',
  'admin',
  'organization',
  'last-login-method',
  'expo'
] as const

const requiredApiMethods = [
  'signUpEmail',
  'signInEmail',
  'requestPasswordReset',
  'resetPassword',
  'signInSocial',
  'signInMagicLink',
  'signInEmailOTP',
  'sendVerificationOTP',
  'generatePasskeyRegistrationOptions',
  'verifyPasskeyRegistration',
  'generatePasskeyAuthenticationOptions',
  'verifyPasskeyAuthentication',
  'enableTwoFactor',
  'verifyTOTP',
  'generateBackupCodes',
  'verifyBackupCode',
  'signInAnonymous',
  'banUser',
  'impersonateUser',
  'createOrganization',
  'createInvitation',
  'setActiveOrganization',
  'getSession',
  'signOut'
] as const

function pluginOptions(id: (typeof requiredPluginIds)[number]): Record<string, unknown> {
  const options = auth.options.plugins?.find(plugin => plugin.id === id)?.options
  return options && typeof options === 'object' ? (options as Record<string, unknown>) : {}
}

describe('auth server', () => {
  it('exposes Better Auth on the governed API path', () => {
    expect(auth.options.basePath).toBe('/api/auth')
    expect(auth.api.getSession).toBeTypeOf('function')
  })

  it('keeps the governed authentication capability matrix enabled', () => {
    expect(auth.options.plugins?.map(plugin => plugin.id)).toEqual(requiredPluginIds)
    expect(Object.keys(auth.options.socialProviders ?? {}).sort()).toEqual(['apple', 'github', 'google'])

    for (const method of requiredApiMethods) {
      expect(auth.api[method], `auth.api.${method}`).toBeTypeOf('function')
    }
  })

  it('keeps verification email callbacks and session policy configured', () => {
    expect(auth.options.emailAndPassword).toMatchObject({
      enabled: true,
      requireEmailVerification: true
    })
    expect(auth.options.emailAndPassword?.sendResetPassword).toBeTypeOf('function')
    expect(auth.options.emailVerification).toMatchObject({
      sendOnSignUp: true,
      autoSignInAfterVerification: true
    })
    expect(auth.options.emailVerification?.sendVerificationEmail).toBeTypeOf('function')
    expect(auth.options.user?.deleteUser?.sendDeleteAccountVerification).toBeTypeOf('function')
    expect(auth.options.user?.changeEmail?.sendChangeEmailConfirmation).toBeTypeOf('function')
    expect(auth.options.session?.cookieCache).toMatchObject({ enabled: true, maxAge: 300 })
  })

  it('keeps plugin delivery hooks and organization authorization configured', () => {
    expect(pluginOptions('magic-link')['sendMagicLink']).toBeTypeOf('function')
    expect(pluginOptions('email-otp')['sendVerificationOTP']).toBeTypeOf('function')
    expect(pluginOptions('organization')['dynamicAccessControl']).toEqual({ enabled: true })
    expect(pluginOptions('organization')['sendInvitationEmail']).toBeTypeOf('function')
    expect(pluginOptions('last-login-method')['customResolveMethod']).toBeTypeOf('function')
  })

  it('does not disable Better Auth CSRF or origin checks', () => {
    expect(auth.options.advanced?.disableCSRFCheck).not.toBe(true)
    expect(auth.options.advanced?.disableOriginCheck).not.toBe(true)
    expect(auth.options.trustedOrigins).toEqual(expect.arrayContaining(['chrome-extension://', 'ray://']))
  })
})
