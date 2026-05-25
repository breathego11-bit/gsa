-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "certificate" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "language" TEXT DEFAULT 'Español',
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "requirements" JSONB;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "locked" BOOLEAN NOT NULL DEFAULT false;
