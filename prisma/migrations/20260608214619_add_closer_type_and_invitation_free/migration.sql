-- CreateEnum
CREATE TYPE "CloserType" AS ENUM ('CRM_ONLY', 'CRM_AND_COURSES');

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "closer_type" "CloserType",
ADD COLUMN     "is_free" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "closer_type" "CloserType";

-- Backfill: usuarios con closer_enabled = true asumimos CRM_AND_COURSES
-- (estado actual: cualquier closer existente es también alumno con acceso a sus cursos).
-- Para CRM_ONLY o cambios de tipo, el admin los ajusta manualmente desde la vista del estudiante.
UPDATE "User" SET "closer_type" = 'CRM_AND_COURSES' WHERE "closer_enabled" = true;
