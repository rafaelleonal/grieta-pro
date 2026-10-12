-- Perfil de juego elegido por el jugador (rango y hasta 2 posiciones). No guarda el Riot ID.
CREATE TABLE "GameProfile" (
    "userId" TEXT NOT NULL,
    "rank" TEXT,
    "positions" "ChampionPosition"[] NOT NULL,
    "onboardedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameProfile_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "GameProfile_version_check" CHECK ("version" > 0),
    CONSTRAINT "GameProfile_positions_check" CHECK (cardinality("positions") <= 2),
    CONSTRAINT "GameProfile_rank_check" CHECK ("rank" IS NULL OR char_length("rank") <= 20)
);

ALTER TABLE "GameProfile" ADD CONSTRAINT "GameProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
