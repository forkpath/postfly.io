import { z } from 'zod'

// 基础校验规则
export const emailSchema = z.email('请输入有效的邮箱地址')
export const passwordSchema = z
  .string()
  .min(8, '密码至少需要8位字符')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_])[A-Za-z\d!@#$%^&*(),.?":{}|<>_]{8,}$/,
    '密码必须包含至少一个小写字母、一个大写字母、一个数字和一个特殊字符'
  )

// ==================== 请求 Schemas (Req后缀) ====================
// 注册请求
export const registerReqSchema = z.object({
  email: emailSchema,
  password: passwordSchema
})

// 登录请求
export const loginReqSchema = z.object({
  email: emailSchema,
  password: passwordSchema
})

// 刷新令牌请求
export const refreshTokenReqSchema = z.object({
  refreshToken: z.string().min(1, '刷新令牌不能为空')
})

// 发送验证邮件请求
export const sendVerificationEmailReqSchema = z.object({
  email: emailSchema
})

// 验证邮件请求
export const verifyEmailReqSchema = z.object({
  email: emailSchema,
  code: z.string().length(6, '验证码必须是6位数字')
})

// 请求密码重置
export const requestPasswordResetReqSchema = z.object({
  email: emailSchema
})

// 重置密码请求
export const resetPasswordReqSchema = z.object({
  token: z.string().min(1, '重置令牌不能为空'),
  newPassword: passwordSchema
})

// ==================== 响应 Schemas (Res后缀) ====================

// 用户角色响应
export const userRoleResSchema = z.object({
  id: z.string(),
  name: z.string()
})

// 基础用户响应
export const userBaseResSchema = z.object({
  id: z.string(),
  email: z.email(),
  emailVerified: z.boolean().optional()
})

// 用户详情响应
export const userDetailResSchema = userBaseResSchema.extend({
  isActive: z.boolean(),
  lastLoginAt: z.date().optional(),
  roles: z.array(userRoleResSchema),
  createdAt: z.date(),
  updatedAt: z.date()
})

// 带认证信息的用户响应
export const userWithAuthResSchema = userBaseResSchema.extend({
  roles: z.array(userRoleResSchema)
})

// 认证令牌响应
export const authTokenResSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userWithAuthResSchema
})

// 邮箱验证要求响应
export const emailVerificationRequiredResSchema = z.object({
  requiresEmailVerification: z.literal(true),
  userId: z.string(),
  email: z.email(),
  message: z.string()
})

// 刷新令牌响应
export const authRefreshTokenResSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string()
})

// JWT载荷
export const jwtPayloadSchema = z.object({
  sub: z.string(), // 用户id
  email: z.email(),
  emailVerified: z.boolean().optional(),
  roles: z.array(userRoleResSchema),
  permissions: z.array(z.string()).optional(),
  iat: z.number().optional(),
  exp: z.number().optional()
})

// 邮箱验证状态响应
export const emailVerificationStatusResSchema = z.object({
  verified: z.boolean()
})

// ==================== 类型推断 ====================

// 请求类型
export type LoginReq = z.infer<typeof loginReqSchema>
export type RegisterReq = z.infer<typeof registerReqSchema>
export type RefreshTokenReq = z.infer<typeof refreshTokenReqSchema>
export type SendVerificationEmailReq = z.infer<typeof sendVerificationEmailReqSchema>
export type VerifyEmailReq = z.infer<typeof verifyEmailReqSchema>
export type RequestPasswordResetReq = z.infer<typeof requestPasswordResetReqSchema>
export type ResetPasswordReq = z.infer<typeof resetPasswordReqSchema>

// 响应类型
export type UserRoleRes = z.infer<typeof userRoleResSchema>
export type UserBaseRes = z.infer<typeof userBaseResSchema>
export type UserDetailRes = z.infer<typeof userDetailResSchema>
export type UserWithAuthRes = z.infer<typeof userWithAuthResSchema>
export type AuthTokenRes = z.infer<typeof authTokenResSchema>
export type AuthRefreshTokenRes = z.infer<typeof authRefreshTokenResSchema>
export type JwtPayload = z.infer<typeof jwtPayloadSchema>
export type EmailVerificationStatusRes = z.infer<typeof emailVerificationStatusResSchema>
