-- CreateEnum
CREATE TYPE "billing"."WebhookEventStatus" AS ENUM ('processed', 'failed', 'skipped');

-- CreateTable
CREATE TABLE "billing"."webhook_event" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "billing"."WebhookEventStatus" NOT NULL,
    "error" TEXT,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_event_provider_type_idx" ON "billing"."webhook_event"("provider", "type");

-- CreateIndex
CREATE INDEX "webhook_event_processed_at_idx" ON "billing"."webhook_event"("processed_at");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_event_event_id_provider_key" ON "billing"."webhook_event"("event_id", "provider");
