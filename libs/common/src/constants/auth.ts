export const SocialProvider = {
  GOOGLE: 'google',
  GITHUB: 'github',
  APPLE: 'apple'
} as const

export type SocialProvider = (typeof SocialProvider)[keyof typeof SocialProvider]

export const UserRole = {
  USER: 'user',
  ADMIN: 'admin'
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export const MemberRole = {
  MEMBER: 'member',
  ADMIN: 'admin',
  OWNER: 'owner'
} as const

export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole]

export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  CANCELED: 'canceled',
  REJECTED: 'rejected'
} as const

export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus]
