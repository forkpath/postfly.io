import { z } from 'zod'

export const generateOrganizationSlugReqSchema = z.object({
  name: z.string().trim().min(1)
})

export type GenerateOrganizationSlugReq = z.infer<typeof generateOrganizationSlugReqSchema>

export const generateOrganizationSlugResSchema = z.object({
  slug: z.string().min(1),
  available: z.boolean()
})

export type GenerateOrganizationSlugRes = z.infer<typeof generateOrganizationSlugResSchema>

export const isOnlyOwnerResSchema = z.object({
  isOnlyOwner: z.boolean()
})

export type IsOnlyOwnerRes = z.infer<typeof isOnlyOwnerResSchema>
