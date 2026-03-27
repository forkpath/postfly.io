-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "billing";

-- CreateEnum
CREATE TYPE "billing"."BillingReferenceType" AS ENUM ('user', 'organization');

-- CreateEnum
CREATE TYPE "billing"."BillingProvider" AS ENUM ('stripe', 'revenuecat', 'superwall');

-- CreateEnum
CREATE TYPE "billing"."BillingSubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'paused');

-- CreateEnum
CREATE TYPE "billing"."BillingOrderStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'canceled');

-- CreateEnum
CREATE TYPE "billing"."BillingInterval" AS ENUM ('day', 'week', 'month', 'year');

-- CreateTable
CREATE TABLE "billing"."customer" (
    "id" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "reference_type" "billing"."BillingReferenceType" NOT NULL DEFAULT 'user',
    "provider" "billing"."BillingProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "email" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."billing_subscription" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider" "billing"."BillingProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "status" "billing"."BillingSubscriptionStatus" NOT NULL,
    "interval" "billing"."BillingInterval",
    "currency" TEXT,
    "amount" INTEGER,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."billing_order" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider" "billing"."BillingProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "status" "billing"."BillingOrderStatus" NOT NULL,
    "currency" TEXT,
    "amount" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."billing_webhook_event" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT,
    "provider" "billing"."BillingProvider" NOT NULL,
    "external_id" TEXT,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_reference_id_provider_idx" ON "billing"."customer"("reference_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "customer_external_id_provider_key" ON "billing"."customer"("external_id", "provider");

-- CreateIndex
CREATE INDEX "billing_subscription_customer_id_status_idx" ON "billing"."billing_subscription"("customer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscription_external_id_provider_key" ON "billing"."billing_subscription"("external_id", "provider");

-- CreateIndex
CREATE INDEX "billing_order_customer_id_status_idx" ON "billing"."billing_order"("customer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_order_external_id_provider_key" ON "billing"."billing_order"("external_id", "provider");

-- CreateIndex
CREATE INDEX "billing_webhook_event_provider_event_type_idx" ON "billing"."billing_webhook_event"("provider", "event_type");

-- CreateIndex
CREATE INDEX "billing_webhook_event_external_id_idx" ON "billing"."billing_webhook_event"("external_id");

-- AddForeignKey
ALTER TABLE "billing"."billing_subscription" ADD CONSTRAINT "billing_subscription_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing"."customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."billing_order" ADD CONSTRAINT "billing_order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing"."customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."billing_webhook_event" ADD CONSTRAINT "billing_webhook_event_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing"."customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
