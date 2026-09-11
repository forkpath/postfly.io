import { randomUUID } from 'node:crypto'

import { Injectable } from '@nestjs/common'

import { PrismaService } from '@libs/pg-dao'

interface ClaimedInboxRow {
  id: string
}

@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  async claim(input: { consumer: string; messageId: string; eventType: string; version: number }): Promise<boolean> {
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
      RETURNING "id"
    `

    return rows.length === 1
  }

  async complete(consumer: string, messageId: string): Promise<void> {
    await this.prisma.inboxMessage.update({
      where: { consumer_messageId: { consumer, messageId } },
      data: {
        status: 'processed',
        processedAt: new Date(),
        leaseUntil: null,
        lastError: null
      }
    })
  }

  async fail(consumer: string, messageId: string, error: string, retrying: boolean): Promise<void> {
    await this.prisma.inboxMessage.update({
      where: { consumer_messageId: { consumer, messageId } },
      data: {
        status: retrying ? 'retrying' : 'failed',
        leaseUntil: null,
        lastError: error.slice(0, 4000)
      }
    })
  }
}
