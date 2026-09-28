import { z } from 'zod'

import { PLATFORM_SMOKE_EVENT } from '@libs/platform-contract'

const organizationId = z.string().min(1).max(200)

export const pulseMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('subscribe'), organizationId }),
  z.object({ type: z.literal('unsubscribe'), organizationId }),
  z.object({
    type: z.literal(PLATFORM_SMOKE_EVENT),
    organizationId,
    payload: z.object({ probeId: z.string().min(1).max(200), message: z.string().max(4000).optional() }).optional()
  })
])
