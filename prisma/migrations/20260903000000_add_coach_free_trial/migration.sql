-- Prueba gratuita del Coach IA para usuarios registrados sin pagar.
-- Cuenta evaluaciones (transcripciones) consumidas. Los usuarios existentes arrancan en 0:
-- los que ya pagaron tienen acceso ilimitado y nunca leen esta columna.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "coach_free_evaluations_used" INTEGER NOT NULL DEFAULT 0;
