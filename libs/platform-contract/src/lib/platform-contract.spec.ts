import { isEventEnvelopeV1 } from './platform-contract'

describe('isEventEnvelopeV1', () => {
  it('accepts the versioned platform envelope', () => {
    expect(
      isEventEnvelopeV1({
        id: 'event-1',
        type: 'platform.smoke',
        version: 1,
        occurredAt: '2026-08-08T00:00:00.000Z',
        correlationId: 'correlation-1',
        actor: { userId: 'user-1', organizationId: 'organization-1' },
        payload: { healthy: true }
      })
    ).toBe(true)
  })

  it('rejects unknown envelope versions', () => {
    expect(
      isEventEnvelopeV1({
        id: 'event-1',
        type: 'platform.smoke',
        version: 2,
        occurredAt: '2026-08-08T00:00:00.000Z',
        correlationId: 'correlation-1',
        actor: { userId: 'user-1' },
        payload: {}
      })
    ).toBe(false)
  })
})
