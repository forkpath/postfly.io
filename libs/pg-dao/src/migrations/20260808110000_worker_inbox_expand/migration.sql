SET lock_timeout = '3s';
SET statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS "public"."worker_inbox" (
  "id" TEXT NOT NULL,
  "consumer" TEXT NOT NULL,
  "message_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "lease_until" TIMESTAMP(3),
  "last_error" TEXT,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "worker_inbox_pkey" PRIMARY KEY ("id")
);
