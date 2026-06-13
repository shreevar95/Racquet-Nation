-- CreateEnum
CREATE TYPE "TournamentVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'INVITE_ONLY');

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "registrationCode" TEXT,
ADD COLUMN     "visibility" "TournamentVisibility" NOT NULL DEFAULT 'PUBLIC';
