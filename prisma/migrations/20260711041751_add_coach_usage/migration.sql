-- CreateTable
CREATE TABLE "CoachUsage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "conversation_id" TEXT,
    "model" TEXT NOT NULL,
    "is_evaluation" BOOLEAN NOT NULL DEFAULT false,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cached_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(12,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachUsage_user_id_idx" ON "CoachUsage"("user_id");

-- CreateIndex
CREATE INDEX "CoachUsage_created_at_idx" ON "CoachUsage"("created_at");

-- AddForeignKey
ALTER TABLE "CoachUsage" ADD CONSTRAINT "CoachUsage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
