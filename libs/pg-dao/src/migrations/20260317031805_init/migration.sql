-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm";

-- CreateEnum
CREATE TYPE "crm"."BillingReferenceType" AS ENUM ('user', 'organization');

-- CreateEnum
CREATE TYPE "crm"."BillingProvider" AS ENUM ('stripe', 'revenuecat', 'superwall');

-- CreateEnum
CREATE TYPE "crm"."BillingSubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'paused');

-- CreateEnum
CREATE TYPE "crm"."BillingOrderStatus" AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'canceled');

-- CreateEnum
CREATE TYPE "crm"."BillingInterval" AS ENUM ('day', 'week', 'month', 'year');

-- CreateTable
CREATE TABLE "organization_role" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "organization_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."billing_customer" (
    "id" TEXT NOT NULL,
    "reference_id" TEXT NOT NULL,
    "reference_type" "crm"."BillingReferenceType" NOT NULL DEFAULT 'user',
    "provider" "crm"."BillingProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "email" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."billing_subscription" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider" "crm"."BillingProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "status" "crm"."BillingSubscriptionStatus" NOT NULL,
    "interval" "crm"."BillingInterval",
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
CREATE TABLE "crm"."billing_order" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider" "crm"."BillingProvider" NOT NULL,
    "external_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "status" "crm"."BillingOrderStatus" NOT NULL,
    "currency" TEXT,
    "amount" INTEGER,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."billing_webhook_event" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT,
    "provider" "crm"."BillingProvider" NOT NULL,
    "external_id" TEXT,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_role_organization_id_idx" ON "organization_role"("organization_id");

-- CreateIndex
CREATE INDEX "organization_role_role_idx" ON "organization_role"("role");

-- CreateIndex
CREATE INDEX "billing_customer_reference_id_provider_idx" ON "crm"."billing_customer"("reference_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customer_external_id_provider_key" ON "crm"."billing_customer"("external_id", "provider");

-- CreateIndex
CREATE INDEX "billing_subscription_customer_id_status_idx" ON "crm"."billing_subscription"("customer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_subscription_external_id_provider_key" ON "crm"."billing_subscription"("external_id", "provider");

-- CreateIndex
CREATE INDEX "billing_order_customer_id_status_idx" ON "crm"."billing_order"("customer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_order_external_id_provider_key" ON "crm"."billing_order"("external_id", "provider");

-- CreateIndex
CREATE INDEX "billing_webhook_event_provider_event_type_idx" ON "crm"."billing_webhook_event"("provider", "event_type");

-- CreateIndex
CREATE INDEX "billing_webhook_event_external_id_idx" ON "crm"."billing_webhook_event"("external_id");

-- AddForeignKey
ALTER TABLE "organization_role" ADD CONSTRAINT "organization_role_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."billing_subscription" ADD CONSTRAINT "billing_subscription_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm"."billing_customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."billing_order" ADD CONSTRAINT "billing_order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm"."billing_customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."billing_webhook_event" ADD CONSTRAINT "billing_webhook_event_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "crm"."billing_customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
