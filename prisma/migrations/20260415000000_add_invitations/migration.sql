-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "payment_type" TEXT NOT NULL,
    "amount_paid" INTEGER NOT NULL,
    "installments" JSONB,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "used_by" TEXT,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
