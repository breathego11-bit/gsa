-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('SINGLE', 'INSTALLMENTS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "closer_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "commission_tiers" JSONB;

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "closer_id" TEXT NOT NULL,
    "customer_first_name" TEXT NOT NULL,
    "customer_last_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "package_name" TEXT NOT NULL,
    "package_description" TEXT,
    "total_amount" INTEGER NOT NULL,
    "payment_type" "PaymentType" NOT NULL,
    "screenshot_url" TEXT NOT NULL,
    "sale_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleInstallment" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3),
    "collected" BOOLEAN NOT NULL DEFAULT false,
    "collected_at" TIMESTAMP(3),

    CONSTRAINT "SaleInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sale_closer_id_idx" ON "Sale"("closer_id");

-- CreateIndex
CREATE INDEX "Sale_sale_date_idx" ON "Sale"("sale_date");

-- CreateIndex
CREATE INDEX "SaleInstallment_sale_id_idx" ON "SaleInstallment"("sale_id");

-- CreateIndex
CREATE INDEX "SaleInstallment_collected_at_idx" ON "SaleInstallment"("collected_at");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_closer_id_fkey" FOREIGN KEY ("closer_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleInstallment" ADD CONSTRAINT "SaleInstallment_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
