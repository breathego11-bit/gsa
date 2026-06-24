-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NUEVO', 'CONTACTADO', 'AGENDADO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "LeadSituation" AS ENUM ('NO_TRABAJANDO', 'MAS_INGRESOS', 'QUIERE_REMOTO', 'EMPRENDE_INESTABLE', 'VENDE_PROFESIONALIZAR', 'YA_CLOSER', 'OTRA');

-- CreateEnum
CREATE TYPE "LeadUrgency" AS ENUM ('AHORA', 'EN_3_MESES', 'EN_6_MESES_O_MAS', 'NO_SE', 'SOLO_INFORMARSE');

-- CreateEnum
CREATE TYPE "LeadInvestment" AS ENUM ('SIN_RECURSOS', 'DE_500_A_1000', 'DE_1000_A_2000', 'SIN_IMPEDIMENTO');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "instagram" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "situation" "LeadSituation" NOT NULL,
    "desired_change" TEXT NOT NULL,
    "objectives" TEXT NOT NULL,
    "cafe_vision" TEXT NOT NULL,
    "urgency" "LeadUrgency" NOT NULL,
    "investment" "LeadInvestment" NOT NULL,
    "meeting_at" TIMESTAMP(3),
    "meeting_tz_iana" TEXT,
    "google_event_id" TEXT,
    "google_event_url" TEXT,
    "meeting_link" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NUEVO',
    "source" TEXT NOT NULL DEFAULT 'landing-survey',
    "assigned_to" TEXT,
    "assigned_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_google_event_id_key" ON "Lead"("google_event_id");

-- CreateIndex
CREATE INDEX "Lead_status_created_at_idx" ON "Lead"("status", "created_at");

-- CreateIndex
CREATE INDEX "Lead_assigned_to_idx" ON "Lead"("assigned_to");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
