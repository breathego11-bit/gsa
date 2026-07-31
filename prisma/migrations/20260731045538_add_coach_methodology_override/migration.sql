-- AlterTable
ALTER TABLE "CoachSetting" ADD COLUMN     "methodology" TEXT;

-- CreateTable
CREATE TABLE "CoachMethodologyVersion" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "CoachMethodologyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachMethodologyVersion_created_at_idx" ON "CoachMethodologyVersion"("created_at");
