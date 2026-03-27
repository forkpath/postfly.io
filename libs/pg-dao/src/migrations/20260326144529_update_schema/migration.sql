/*
  Warnings:

  - You are about to drop the column `email` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the column `reference_type` on the `customer` table. All the data in the column will be lost.
  - You are about to drop the `billing_order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `billing_subscription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `billing_webhook_event` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[reference_id,provider]` on the table `customer` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `provider` on the `customer` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "billing"."SubscriptionStatus" AS ENUM ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'paused', 'trialing', 'unpaid');

-- CreateEnum
CREATE TYPE "billing"."PaymentStatus" AS ENUM ('pending', 'succeeded', 'failed');

-- DropForeignKey
ALTER TABLE "billing"."billing_order" DROP CONSTRAINT "billing_order_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "billing"."billing_subscription" DROP CONSTRAINT "billing_subscription_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "billing"."billing_webhook_event" DROP CONSTRAINT "billing_webhook_event_customer_id_fkey";

-- DropIndex
DROP INDEX "billing"."customer_reference_id_provider_idx";

-- AlterTable
ALTER TABLE "billing"."customer" DROP COLUMN "email",
DROP COLUMN "metadata",
DROP COLUMN "reference_type",
DROP COLUMN "provider",
ADD COLUMN     "provider" TEXT NOT NULL;

-- DropTable
DROP TABLE "billing"."billing_order";

-- DropTable
DROP TABLE "billing"."billing_subscription";

-- DropTable
DROP TABLE "billing"."billing_webhook_event";

-- DropEnum
DROP TYPE "billing"."BillingInterval";

-- DropEnum
DROP TYPE "billing"."BillingOrderStatus";

-- DropEnum
DROP TYPE "billing"."BillingProvider";

-- DropEnum
DROP TYPE "billing"."BillingReferenceType";

-- DropEnum
DROP TYPE "billing"."BillingSubscriptionStatus";

-- CreateTable
CREATE TABLE "billing"."subscription" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "status" "billing"."SubscriptionStatus" NOT NULL,
    "store" TEXT NOT NULL,
    "period_starts_at" TIMESTAMP(3) NOT NULL,
    "period_ends_at" TIMESTAMP(3) NOT NULL,
    "trial_starts_at" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."order" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "status" "billing"."PaymentStatus" NOT NULL,
    "store" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_external_id_store_key" ON "billing"."subscription"("external_id", "store");

-- CreateIndex
CREATE UNIQUE INDEX "order_external_id_store_key" ON "billing"."order"("external_id", "store");

-- CreateIndex
CREATE UNIQUE INDEX "customer_reference_id_provider_key" ON "billing"."customer"("reference_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "customer_external_id_provider_key" ON "billing"."customer"("external_id", "provider");

-- AddForeignKey
ALTER TABLE "billing"."subscription" ADD CONSTRAINT "subscription_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing"."customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."order" ADD CONSTRAINT "order_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "billing"."customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
