export interface PulseIdentity {
  sessionId: string
  userId: string
  expiresAt: number
}

export abstract class PulseAccessRepository {
  abstract isSessionActive(identity: PulseIdentity): Promise<boolean>
  abstract isMember(organizationId: string, userId: string): Promise<boolean>
}
