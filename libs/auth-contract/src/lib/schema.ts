import * as z from 'zod'

import { UserRole } from '@libs/common'

export const emailSchema = z.object({ email: z.email().max(254) })
export const password = z.string().min(8)
export const passwordSchema = z.object({ password })
export const otpSchema = z.object({ code: z.string().min(6).max(6) })
export const backupCodeSchema = z.object({ code: z.string().min(11).max(11) })
const trustDeviceSchema = z.object({ trustDevice: z.boolean().optional() })

export const updateUserSchema = z.object({
  name: z.string().min(2).max(32).optional(),
  role: z.enum(UserRole).optional(),
  image: z.url().optional()
})
export const changePasswordSchema = z.object({
  ...passwordSchema.shape,
  newPassword: password
})
export const registerSchema = z.object({
  ...emailSchema.shape,
  ...passwordSchema.shape
})
export const passwordLoginSchema = z.object({
  ...emailSchema.shape,
  ...passwordSchema.shape,
  rememberMe: z.boolean().optional().default(true)
})
export const magicLinkLoginSchema = emailSchema
export const emailOtpLoginSchema = z.object({
  ...emailSchema.shape,
  otp: z.string().min(6).max(6)
})
export const emailOtpVerificationSchema = z.object({
  ...emailSchema.shape,
  ...otpSchema.shape
})
export const forgotPasswordSchema = emailSchema
export const updatePasswordSchema = passwordSchema
export const otpVerificationSchema = z.object({
  ...otpSchema.shape,
  ...trustDeviceSchema.shape
})
export const backupCodeVerificationSchema = z.object({
  ...backupCodeSchema.shape,
  ...trustDeviceSchema.shape
})
export const createOrganizationSchema = z.object({ name: z.string().min(2).max(32) })
export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(32).optional(),
  slug: z.string().optional(),
  logo: z.string().optional()
})
export const inviteMemberSchema = z.object({
  email: z.email().max(254),
  role: z.string().min(1).max(64)
})
export const updateMemberSchema = z.object({ role: z.string().min(1).max(64).optional() })
export const banUserSchema = z.object({
  reason: z.string().min(1).max(1000).optional(),
  expiresIn: z
    .date()
    .optional()
    .refine(date => !date || date > new Date())
})

export type EmailPayload = z.infer<typeof emailSchema>
export type PasswordLoginPayload = z.infer<typeof passwordLoginSchema>
export type MagicLinkLoginPayload = z.infer<typeof magicLinkLoginSchema>
export type EmailOtpLoginPayload = z.infer<typeof emailOtpLoginSchema>
export type EmailOtpVerificationPayload = z.infer<typeof emailOtpVerificationSchema>
export type RegisterPayload = z.infer<typeof registerSchema>
export type ForgotPasswordPayload = z.infer<typeof forgotPasswordSchema>
export type UpdatePasswordPayload = z.infer<typeof updatePasswordSchema>
export type PasswordPayload = z.infer<typeof passwordSchema>
export type UpdateUserPayload = z.infer<typeof updateUserSchema>
export type ChangePasswordPayload = z.infer<typeof changePasswordSchema>
export type OtpPayload = z.infer<typeof otpSchema>
export type OtpVerificationPayload = z.infer<typeof otpVerificationSchema>
export type BackupCodePayload = z.infer<typeof backupCodeSchema>
export type BackupCodeVerificationPayload = z.infer<typeof backupCodeVerificationSchema>
export type CreateOrganizationPayload = z.infer<typeof createOrganizationSchema>
export type UpdateOrganizationPayload = z.infer<typeof updateOrganizationSchema>
export type InviteMemberPayload = z.infer<typeof inviteMemberSchema>
export type UpdateMemberPayload = z.infer<typeof updateMemberSchema>
export type BanUserPayload = z.infer<typeof banUserSchema>
