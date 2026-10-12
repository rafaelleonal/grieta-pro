CREATE TYPE "ChampionPosition" AS ENUM ('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT');

CREATE TABLE "ChampionPreference" (
    "userId" TEXT NOT NULL,
    "role" "ChampionPosition" NOT NULL,
    "champions" TEXT[] NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChampionPreference_pkey" PRIMARY KEY ("userId", "role"),
    CONSTRAINT "ChampionPreference_version_check" CHECK ("version" > 0),
    CONSTRAINT "ChampionPreference_count_check" CHECK (cardinality("champions") <= 12)
);

ALTER TABLE "ChampionPreference" ADD CONSTRAINT "ChampionPreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
