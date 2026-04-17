-- AlterTable: Add blocked to User
ALTER TABLE "User" ADD COLUMN "blocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Restructure Payment
-- Add new columns
ALTER TABLE "Payment" ADD COLUMN "amount" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "installment_number" INTEGER;
ALTER TABLE "Payment" ADD COLUMN "installment_plan_id" TEXT;
ALTER TABLE "Payment" ADD COLUMN "due_date" TIMESTAMP(3);

-- Migrate existing data: copy amount_total to amount
UPDATE "Payment" SET "amount" = "amount_total";

-- For existing installment records, set installment_number and plan_id
UPDATE "Payment" SET "installment_number" = 1, "installment_plan_id" = "id" WHERE "payment_type" = 'installment';

-- Make amount NOT NULL now that data is migrated
ALTER TABLE "Payment" ALTER COLUMN "amount" SET NOT NULL;

-- Drop old columns
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "stripe_subscription_id";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "amount_total";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "installments_paid";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "installments_total";

-- Create index on installment_plan_id
CREATE INDEX "Payment_installment_plan_id_idx" ON "Payment"("installment_plan_id");

-- CreateTable: SiteSettings
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "pricing" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- Seed default pricing
INSERT INTO "SiteSettings" ("id", "pricing", "updated_at")
VALUES ('singleton', '{"totalPrice": 188800, "firstInstallment": 188800, "installmentCount": 1}', NOW());
