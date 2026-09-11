import * as z from 'zod'

import { InvitationStatus, MemberRole, SocialProvider, UserRole } from '@libs/common'

export { InvitationStatus, MemberRole, SocialProvider, UserRole }

export const AuthProvider = {
  ...SocialProvider,
  PASSWORD: 'password',
  MAGIC_LINK: 'magicLink',
  EMAIL_OTP: 'emailOtp',
  ANONYMOUS: 'anonymous',
  PASSKEY: 'passkey'
} as const

export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider]

export const SecondFactor = {
  TOTP: 'totp',
  BACKUP_CODE: 'backupCode'
} as const

export type SecondFactor = (typeof SecondFactor)[keyof typeof SecondFactor]

export const VerificationType = {
  MAGIC_LINK: 'magic-link',
  DELETE_ACCOUNT: 'delete-account',
  CONFIRM_EMAIL: 'confirm-email'
} as const

export type VerificationType = (typeof VerificationType)[keyof typeof VerificationType]

export const authConfigSchema = z.object({
  providers: z.object({
    [AuthProvider.PASSWORD]: z.boolean(),
    [AuthProvider.MAGIC_LINK]: z.boolean(),
    [AuthProvider.EMAIL_OTP]: z.boolean(),
    [AuthProvider.ANONYMOUS]: z.boolean(),
    [AuthProvider.PASSKEY]: z.boolean().optional(),
    oAuth: z.array(z.enum(SocialProvider))
  })
})

export type AuthConfig = z.infer<typeof authConfigSchema>

export interface User {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
  role?: string | null
  banned?: boolean | null
  banReason?: string | null
  banExpires?: Date | null
  isAnonymous?: boolean | null
  twoFactorEnabled?: boolean | null
}

export interface AuthSessionRecord {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  ipAddress?: string | null
  userAgent?: string | null
  activeOrganizationId?: string | null
  activeTeamId?: string | null
  impersonatedBy?: string | null
}

export interface Session {
  user: User
  session: AuthSessionRecord
}

export interface Organization {
  id: string
  name: string
  slug: string
  logo?: string | null
  metadata?: unknown
  createdAt: Date
}

export interface Member {
  id: string
  userId: string
  organizationId: string
  role: MemberRole
  createdAt: Date
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
}

export interface Invitation {
  id: string
  email: string
  inviterId: string
  organizationId: string
  role: MemberRole
  status: InvitationStatus
  expiresAt: Date
  createdAt: Date
  teamId?: string | null
}

export interface ActiveOrganization extends Organization {
  members: Member[]
  invitations: Invitation[]
}
