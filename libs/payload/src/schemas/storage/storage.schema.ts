import { z } from 'zod'

const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp'] as const

export const storagePathReqSchema = z.object({
  path: z
    .string()
    .min(1)
    .refine(
      value => {
        const ext = value.split('.').pop()?.toLowerCase()
        return ext ? allowedExtensions.includes(ext as (typeof allowedExtensions)[number]) : false
      },
      `Unsupported file type. Allowed: ${allowedExtensions.join(', ')}`
    )
})

export type StoragePathReq = z.infer<typeof storagePathReqSchema>

export const storageUrlResSchema = z.object({
  url: z.string().min(1)
})

export type StorageUrlRes = z.infer<typeof storageUrlResSchema>
