export interface EventActorV1 {
  userId: string
  organizationId?: string
}

export interface EventEnvelopeV1<TPayload> {
  id: string
  type: string
  version: 1
  occurredAt: string
  correlationId: string
  actor: EventActorV1
  payload: TPayload
}

export const PLATFORM_SMOKE_EVENT = 'platform.smoke' as const
export const PLATFORM_EVENT_EXCHANGE = 'platform.events.v1' as const
export const PLATFORM_EVENT_DLX = 'platform.events.v1.dlx' as const

export interface PlatformSmokePayload {
  probeId: string
  message?: string
}

export function isEventEnvelopeV1(value: unknown): value is EventEnvelopeV1<unknown> {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<EventEnvelopeV1<unknown>>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.type === 'string' &&
    candidate.version === 1 &&
    typeof candidate.occurredAt === 'string' &&
    typeof candidate.correlationId === 'string' &&
    !!candidate.actor &&
    typeof candidate.actor.userId === 'string' &&
    'payload' in candidate
  )
}
