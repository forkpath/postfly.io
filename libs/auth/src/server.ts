import { expo } from '@better-auth/expo'
import { passkey } from '@better-auth/passkey'
import { render } from '@react-email/render'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { betterAuth } from 'better-auth/minimal'
import { nextCookies } from 'better-auth/next-js'
import { admin, anonymous, lastLoginMethod, magicLink, organization, twoFactor } from 'better-auth/plugins'

import {
  ChangeEmail,
  ConfirmEmail,
  ContactForm,
  DeleteAccount,
  EmailTemplate,
  MagicLink,
  OrganizationInvitation,
  ResetPassword,
  sendEmail as sendRawEmail
} from '@libs/email'
import { getLocaleFromRequest } from '@libs/i18n'
import { PrismaClient } from '@libs/pg-dao'

import { env } from './env'
import { getUrl } from './lib/utils'
import { AuthProvider, SocialProvider, VerificationType } from './types'

const prisma = new PrismaClient()

const templates = {
  [EmailTemplate.CHANGE_EMAIL]: ChangeEmail,
  [EmailTemplate.CONFIRM_EMAIL]: ConfirmEmail,
  [EmailTemplate.DELETE_ACCOUNT]: DeleteAccount,
  [EmailTemplate.MAGIC_LINK]: MagicLink,
  [EmailTemplate.ORGANIZATION_INVITATION]: OrganizationInvitation,
  [EmailTemplate.RESET_PASSWORD]: ResetPassword,
  [EmailTemplate.CONTACT_FORM]: ContactForm
} as const

const sendTemplateEmail = async <T extends EmailTemplate>({
  to,
  template,
  locale,
  variables
}: {
  to: string
  template: T
  locale?: string
  variables: Parameters<(typeof templates)[T]>[0]
}) => {
  const Template = templates[template]
  const element = await Template({
    ...(variables as Parameters<(typeof templates)[T]>[0]),
    locale
  } as Parameters<typeof Template>[0])
  const subject = Template.subject
    ? await (Template.subject as (args?: unknown) => Promise<string>)({
        ...(variables as Record<string, unknown>),
        locale
      })
    : undefined

  if (!subject) {
    throw new Error(`Missing email subject for template: ${template}`)
  }

  const html = render(element)
  return sendRawEmail({ to, subject, html })
}

export const auth = betterAuth({
  appName: 'TurboStarter',
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // 5 minutes
    }
  },
  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }, request) =>
        sendTemplateEmail({
          to: user.email,
          template: EmailTemplate.DELETE_ACCOUNT,
          locale: getLocaleFromRequest(request),
          variables: {
            url: getUrl({
              request,
              url,
              type: VerificationType.DELETE_ACCOUNT
            }).toString()
          }
        })
    },
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }, request) =>
        sendTemplateEmail({
          to: user.email,
          template: EmailTemplate.CHANGE_EMAIL,
          locale: getLocaleFromRequest(request),
          variables: {
            url: getUrl({
              request,
              url,
              type: VerificationType.CONFIRM_EMAIL
            }).toString(),
            newEmail
          }
        })
    }
  },
  trustedOrigins: [
    'chrome-extension://',
    'turbostarter://',
    /* Needed only for Apple ID authentication */
    'https://appleid.apple.com',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost*', 'https://localhost*'] : [])
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }, request) =>
      sendTemplateEmail({
        to: user.email,
        template: EmailTemplate.RESET_PASSWORD,
        locale: getLocaleFromRequest(request),
        variables: {
          url
        }
      })
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }, request) =>
      sendTemplateEmail({
        to: user.email,
        template: EmailTemplate.CONFIRM_EMAIL,
        locale: getLocaleFromRequest(request),
        variables: {
          url: getUrl({
            request,
            url,
            type: VerificationType.CONFIRM_EMAIL
          }).toString()
        }
      })
  },
  database: prismaAdapter(prisma),
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }, ctx) =>
        sendTemplateEmail({
          to: email,
          template: EmailTemplate.MAGIC_LINK,
          locale: getLocaleFromRequest(ctx?.request),
          variables: {
            url: getUrl({
              request: ctx?.request,
              url,
              type: VerificationType.MAGIC_LINK
            }).toString()
          }
        })
    }),
    passkey(),
    twoFactor(),
    anonymous(),
    admin(),
    organization({
      sendInvitationEmail: async ({ invitation, inviter, organization }, request) => {
        const url = getUrl({
          request
        })
        url.searchParams.set('invitationId', invitation.id)
        url.searchParams.set('email', invitation.email)

        return sendTemplateEmail({
          to: invitation.email,
          template: EmailTemplate.ORGANIZATION_INVITATION,
          locale: getLocaleFromRequest(request),
          variables: {
            url: url.toString(),
            inviter: inviter.user.name,
            organization: organization.name
          }
        })
      }
    }),
    lastLoginMethod({
      customResolveMethod: ctx => {
        switch (ctx.path) {
          case '/magic-link/verify':
            return AuthProvider.MAGIC_LINK
          case '/passkey/verify-authentication':
            return AuthProvider.PASSKEY
          default:
            return null
        }
      }
    }),
    expo(),
    nextCookies()
  ],
  socialProviders: {
    [SocialProvider.APPLE]: {
      clientId: env.APPLE_CLIENT_ID,
      clientSecret: env.APPLE_CLIENT_SECRET,
      appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER
    },
    [SocialProvider.GOOGLE]: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    },
    [SocialProvider.GITHUB]: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET
    }
  },
  advanced: {
    cookiePrefix: 'turbostarter',
    cookies: {
      state: {
        attributes: {
          sameSite: 'none',
          secure: true
        }
      }
    }
  },
  logger: {
    log: (level, ...args) => {
      const fn =
        level === 'fatal'
          ? console.error
          : level in console
            ? console[level as 'debug' | 'info' | 'warn' | 'error' | 'log']
            : console.log
      fn(...args)
    }
  }
})

export type AuthErrorCode = keyof typeof auth.$ERROR_CODES
export type Session = typeof auth.$Infer.Session
export type User = Session['user']
export type Invitation = typeof auth.$Infer.Invitation
export type Organization = typeof auth.$Infer.Organization
export type ActiveOrganization = typeof auth.$Infer.ActiveOrganization
export type Member = typeof auth.$Infer.Member
