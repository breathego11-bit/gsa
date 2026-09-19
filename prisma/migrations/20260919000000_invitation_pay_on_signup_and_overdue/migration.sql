-- Invitaciones "pagará al registrarse" + gestión de cobros y del impago.
-- Todo aditivo y sin backfill: las invitaciones existentes quedan en false (se comportan como
-- "ya pagó por fuera") y los pagos existentes sin avisos registrados.

-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "pay_on_signup" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "overdue_notice_sent_at" TIMESTAMP(3),
ADD COLUMN     "payment_link_sent_at" TIMESTAMP(3);
