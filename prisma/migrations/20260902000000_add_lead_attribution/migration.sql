-- Atribución de campaña en los leads (UTMs + fbclid).
-- Todas las columnas son nullable: los leads existentes quedan con NULL, sin backfill
-- ni downtime, y la landing puede desplegarse antes o después que esta migración.

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "utm_source" TEXT,
ADD COLUMN     "utm_medium" TEXT,
ADD COLUMN     "utm_campaign" TEXT,
ADD COLUMN     "utm_content" TEXT,
ADD COLUMN     "utm_term" TEXT,
ADD COLUMN     "fbclid" TEXT,
ADD COLUMN     "landing_url" TEXT,
ADD COLUMN     "referrer" TEXT,
ADD COLUMN     "attribution_first" JSONB,
ADD COLUMN     "attribution_last" JSONB;

-- CreateIndex
CREATE INDEX "Lead_utm_campaign_idx" ON "Lead"("utm_campaign");

-- CreateIndex
CREATE INDEX "Lead_utm_source_created_at_idx" ON "Lead"("utm_source", "created_at");
