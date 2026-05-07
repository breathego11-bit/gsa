-- 1. Crear tabla nueva
CREATE TABLE "CourseInstructor" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseInstructor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseInstructor_course_id_user_id_key" ON "CourseInstructor"("course_id", "user_id");

-- CreateIndex
CREATE INDEX "CourseInstructor_course_id_order_idx" ON "CourseInstructor"("course_id", "order");

-- AddForeignKey
ALTER TABLE "CourseInstructor" ADD CONSTRAINT "CourseInstructor_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseInstructor" ADD CONSTRAINT "CourseInstructor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. Backfill: copiar instructor_id existente a la tabla nueva (preserva data)
INSERT INTO "CourseInstructor" ("id", "course_id", "user_id", "order", "created_at")
SELECT
    'cinst_' || substring(md5(random()::text || clock_timestamp()::text), 1, 24),
    "id",
    "instructor_id",
    0,
    CURRENT_TIMESTAMP
FROM "Course"
WHERE "instructor_id" IS NOT NULL;

-- 3. Eliminar la FK y la columna vieja
ALTER TABLE "Course" DROP CONSTRAINT IF EXISTS "Course_instructor_id_fkey";
ALTER TABLE "Course" DROP COLUMN "instructor_id";
