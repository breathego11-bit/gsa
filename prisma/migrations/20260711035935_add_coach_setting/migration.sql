-- CreateTable
CREATE TABLE "CoachSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "extra_instructions" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "CoachSetting_pkey" PRIMARY KEY ("id")
);
