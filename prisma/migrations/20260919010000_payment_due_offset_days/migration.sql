-- Cuotas que se cuentan "desde el primer pago" (invitaciones "pagará al registrarse"):
-- nacen sin due_date y con el desfase en días; la fecha se fija al cobrarse el primer pago.

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "due_offset_days" INTEGER;
