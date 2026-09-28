import { randomUUID } from 'node:crypto'

import { Injectable } from '@nestjs/common'

import { PrismaService } from '@libs/pg-dao'

interface ClaimedInboxRow {
  attemptCount: number
}

@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  async claim(input: {
    consumer: string
    messageId: string
    eventType: string
    version: number
  }): Promise<number | undefined> {
    const id = randomUUID()
    const rows = await this.prisma.$queryRaw<ClaimedInboxRow[]>`
      INSERT INTO "public"."worker_inbox" (
        "id", "consumer", "message_id", "event_type", "version",
        "status", "attempt_count", "lease_until", "created_at", "updated_at"
      ) VALUES (
        ${id}, ${input.consumer}, ${input.messageId}, ${input.eventType}, ${input.version},
        'processing', 1, NOW() + INTERVAL '5 minutes', NOW(), NOW()
      )
      ON CONFLICT ("consumer", "message_id") DO UPDATE SET
        "status" = 'processing',
        "attempt_count" = "worker_inbox"."attempt_count" + 1,
        "lease_until" = NOW() + INTERVAL '5 minutes',
        "last_error" = NULL,
        "updated_at" = NOW()
      WHERE "worker_inbox"."status" <> 'processed'
        AND (
          "worker_inbox"."lease_until" IS NULL
          OR "worker_inbox"."lease_until" < NOW()
          OR "worker_inbox"."status" IN ('failed', 'retrying')
        )
      RETURNING "attempt_count" AS "attemptCount"
    `

    return rows[0]?.attemptCount
  }

  async retryAfter(consumer: string, messageId: string): Promise<number | undefined> {
    const row = await this.prisma.inboxMessage.findUnique({
      where: { consumer_messageId: { consumer, messageId } },
      select: { status: true, leaseUntil: true }
    })
    if (row?.status === 'processed') return undefined
    return Math.max(1000, Math.min(30_000, (row?.leaseUntil?.getTime() ?? Date.now()) - Date.now() + 100))
  }

  async complete(consumer: string, messageId: string, attemptCount: number): Promise<boolean> {
    const result = await this.prisma.inboxMessage.updateMany({
      where: { consumer, messageId, attemptCount, status: 'processing' },
      data: {
        status: 'processed',
        processedAt: new Date(),
        leaseUntil: null,
        lastError: null
      }
    })
    return result.count === 1
  }

  async fail(
    consumer: string,
    messageId: string,
    error: string,
    retrying: boolean,
    attemptCount: number
  ): Promise<boolean> {
    const result = await this.prisma.inboxMessage.updateMany({
      where: { consumer, messageId, attemptCount, status: 'processing' },
      data: {
        status: retrying ? 'retrying' : 'failed',
        leaseUntil: null,
        lastError: error.slice(0, 4000)
      }
    })
    return result.count === 1
  }
}
