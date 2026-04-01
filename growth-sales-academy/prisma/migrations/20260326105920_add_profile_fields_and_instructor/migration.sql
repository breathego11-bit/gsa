-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "instructor_id" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "title" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LessonNote_user_id_lesson_id_key" ON "LessonNote"("user_id", "lesson_id");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
