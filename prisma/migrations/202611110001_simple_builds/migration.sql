-- ADR 0009: builds simples. No borra datos: el registro de reservas anterior se conserva
-- como histórico y deja de usarse para generar.

-- El historial nuevo ya no depende de una reserva.
ALTER TABLE "CoachRecord" ALTER COLUMN "requestId" DROP NOT NULL;

-- Build validada y compartida por versión de Data Dragon y matchup. Sin datos de usuario.
CREATE TABLE "BuildCache" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "champion" TEXT NOT NULL,
    "enemy" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "contract" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BuildCache_version_champion_enemy_role_model_contract_key"
ON "BuildCache"("version", "champion", "enemy", "role", "model", "contract");

-- Contadores diarios (UTC) de builds generadas con IA y coste informado por OpenRouter.
CREATE TABLE "BuildUsage" (
    "scope" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "builds" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(18,8) NOT NULL DEFAULT 0,

    CONSTRAINT "BuildUsage_pkey" PRIMARY KEY ("scope", "day"),
    CONSTRAINT "BuildUsage_builds_check" CHECK ("builds" >= 0),
    CONSTRAINT "BuildUsage_cost_check" CHECK ("costUsd" >= 0)
);
