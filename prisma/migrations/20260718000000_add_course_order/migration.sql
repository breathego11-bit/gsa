-- AlterTable: orden global del catálogo para la división por tramos de cuotas
ALTER TABLE "Course" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: asigna orden a los cursos existentes por antigüedad (más antiguo = 0, 1, 2, …)
WITH ordered AS (
    SELECT "id", (ROW_NUMBER() OVER (ORDER BY "created_at" ASC) - 1) AS rn
    FROM "Course"
)
UPDATE "Course" c SET "order" = o.rn
FROM ordered o
WHERE c."id" = o."id";

-- CreateIndex
CREATE INDEX "Course_order_idx" ON "Course"("order");
