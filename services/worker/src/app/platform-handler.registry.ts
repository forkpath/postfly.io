import { Injectable, Logger } from '@nestjs/common'

import { EventEnvelopeV1, PLATFORM_SMOKE_EVENT, PlatformSmokePayload } from '@libs/platform-contract'

type PlatformHandler = (envelope: EventEnvelopeV1<unknown>) => Promise<void>

@Injectable()
export class PlatformHandlerRegistry {
  private readonly logger = new Logger(PlatformHandlerRegistry.name)
  private readonly handlers = new Map<string, Map<number, PlatformHandler>>()

  constructor() {
    this.register<PlatformSmokePayload>(PLATFORM_SMOKE_EVENT, 1, async envelope => {
      this.logger.log(`Platform smoke event processed: id=${envelope.id}, correlationId=${envelope.correlationId}`)
    })
  }

  register<TPayload>(
    type: string,
    version: number,
    handler: (envelope: EventEnvelopeV1<TPayload>) => Promise<void>
  ): void {
    const versions = this.handlers.get(type) ?? new Map<number, PlatformHandler>()
    versions.set(version, handler as PlatformHandler)
    this.handlers.set(type, versions)
  }

  resolve(type: string, version: number): PlatformHandler | undefined {
    return this.handlers.get(type)?.get(version)
  }

  readiness(): { types: string[]; versions: number[] } {
    return {
      types: [...this.handlers.keys()],
      versions: [...new Set([...this.handlers.values()].flatMap(versions => [...versions.keys()]))]
    }
  }
}
