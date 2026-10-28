-- Autorización de un admin para que un closer reciba leads (spec_closer_leads_review_fixes.md).
-- Separada de `lead_booking_enabled`, que vuelve a significar solo "conectó su calendario".
-- Nace en false a propósito: ningún closer queda en el reparto al desplegar, ni siquiera los que
-- ya hubieran conectado su calendario; los activa un admin. Los admins no usan esta columna.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lead_booking_authorized" BOOLEAN NOT NULL DEFAULT false;
