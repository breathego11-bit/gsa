-- AlterTable
ALTER TABLE "User" ADD COLUMN     "welcome_video_bunny_id" TEXT,
ADD COLUMN     "welcome_video_snoozed_until" TIMESTAMP(3),
ADD COLUMN     "welcome_video_status" TEXT,
ADD COLUMN     "welcome_video_uploaded_at" TIMESTAMP(3);
