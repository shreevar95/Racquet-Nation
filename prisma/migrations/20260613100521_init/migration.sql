-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('APPLIED', 'APPROVED', 'WAITLISTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TeamRole" AS ENUM ('CAPTAIN', 'MANAGER', 'PLAYER');

-- CreateEnum
CREATE TYPE "TournamentAdminRole" AS ENUM ('ADMIN', 'SCORER');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('UPCOMING', 'OPEN_FOR_SUBMISSION', 'LOCKED', 'IN_PROGRESS', 'COMPLETED', 'TIEBREAK_REQUIRED');

-- CreateEnum
CREATE TYPE "QualificationStatus" AS ENUM ('QUALIFIED', 'ELIMINATED', 'GROUP_LEADER', 'ON_THE_BUBBLE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REGISTRATION_APPROVED', 'REGISTRATION_REJECTED', 'REGISTRATION_WAITLISTED', 'TEAM_ASSIGNED', 'MATCH_SCHEDULED', 'LINEUP_DEADLINE', 'LINEUP_LOCKED', 'RESULT_PUBLISHED', 'ANNOUNCEMENT', 'TIEBREAK_REQUIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "yearsPlaying" INTEGER,
    "selfRating" DOUBLE PRECISION,
    "bio" TEXT,
    "location" TEXT,
    "emergencyContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sport_templates" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "scoringConfig" JSONB NOT NULL,
    "matchFormat" JSONB NOT NULL,
    "description" TEXT,

    CONSTRAINT "sport_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportTemplateId" TEXT NOT NULL,
    "creatorId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "structure" JSONB NOT NULL,
    "matchFormatOverride" JSONB,
    "scoringOverride" JSONB,
    "standingsConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "templateId" TEXT,
    "createdBy" TEXT NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "venueAddress" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "description" TEXT,
    "rules" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "maxPlayers" INTEGER NOT NULL,
    "numTeams" INTEGER NOT NULL,
    "playersPerTeam" INTEGER NOT NULL,
    "numGroups" INTEGER NOT NULL,
    "matchFormat" JSONB NOT NULL,
    "scoringConfig" JSONB NOT NULL,
    "standingsConfig" JSONB NOT NULL,
    "tiebreakConfig" JSONB NOT NULL,
    "registrationConfig" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_groups" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "tournament_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_admins" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TournamentAdminRole" NOT NULL DEFAULT 'ADMIN',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,

    CONSTRAINT "tournament_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "groupId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "captainId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_memberships" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'PLAYER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'APPLIED',
    "formData" JSONB NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "groupId" TEXT,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'UPCOMING',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "court" TEXT,
    "round" INTEGER,
    "matchNumber" INTEGER,
    "homeTeamScore" INTEGER,
    "awayTeamScore" INTEGER,
    "winnerId" TEXT,
    "isTiebreak" BOOLEAN NOT NULL DEFAULT false,
    "tiebreakWinnerId" TEXT,
    "scorecardUrl" TEXT,
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_games" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "gameNumber" INTEGER NOT NULL,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "winnerId" TEXT,
    "isTiebreak" BOOLEAN NOT NULL DEFAULT false,
    "homePlayer1Id" TEXT,
    "homePlayer2Id" TEXT,
    "awayPlayer1Id" TEXT,
    "awayPlayer2Id" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "match_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_lineups" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedBy" TEXT,
    "lockedAt" TIMESTAMP(3),
    "isVisible" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "match_lineups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lineup_slots" (
    "id" TEXT NOT NULL,
    "lineupId" TEXT NOT NULL,
    "gameNumber" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,

    CONSTRAINT "lineup_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standings" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "matchesPlayed" INTEGER NOT NULL DEFAULT 0,
    "matchesWon" INTEGER NOT NULL DEFAULT 0,
    "matchesLost" INTEGER NOT NULL DEFAULT 0,
    "matchesDrawn" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "gamesLost" INTEGER NOT NULL DEFAULT 0,
    "gameDifferential" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "qualificationStatus" "QualificationStatus",
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "player_profiles_userId_key" ON "player_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "player_profiles_slug_key" ON "player_profiles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sports_name_key" ON "sports"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sports_slug_key" ON "sports"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tournaments_slug_key" ON "tournaments"("slug");

-- CreateIndex
CREATE INDEX "tournaments_status_idx" ON "tournaments"("status");

-- CreateIndex
CREATE INDEX "tournaments_sportId_idx" ON "tournaments"("sportId");

-- CreateIndex
CREATE INDEX "tournaments_startDate_idx" ON "tournaments"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_groups_tournamentId_order_key" ON "tournament_groups"("tournamentId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_admins_tournamentId_userId_key" ON "tournament_admins"("tournamentId", "userId");

-- CreateIndex
CREATE INDEX "teams_tournamentId_idx" ON "teams"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_tournamentId_slug_key" ON "teams"("tournamentId", "slug");

-- CreateIndex
CREATE INDEX "team_memberships_playerId_idx" ON "team_memberships"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "team_memberships_teamId_playerId_key" ON "team_memberships"("teamId", "playerId");

-- CreateIndex
CREATE INDEX "registrations_tournamentId_status_idx" ON "registrations"("tournamentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registrations_tournamentId_playerId_key" ON "registrations"("tournamentId", "playerId");

-- CreateIndex
CREATE UNIQUE INDEX "matches_slug_key" ON "matches"("slug");

-- CreateIndex
CREATE INDEX "matches_tournamentId_status_idx" ON "matches"("tournamentId", "status");

-- CreateIndex
CREATE INDEX "matches_tournamentId_scheduledAt_idx" ON "matches"("tournamentId", "scheduledAt");

-- CreateIndex
CREATE INDEX "matches_homeTeamId_idx" ON "matches"("homeTeamId");

-- CreateIndex
CREATE INDEX "matches_awayTeamId_idx" ON "matches"("awayTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "match_games_matchId_gameNumber_key" ON "match_games"("matchId", "gameNumber");

-- CreateIndex
CREATE UNIQUE INDEX "match_lineups_matchId_teamId_key" ON "match_lineups"("matchId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "lineup_slots_lineupId_gameNumber_position_key" ON "lineup_slots"("lineupId", "gameNumber", "position");

-- CreateIndex
CREATE INDEX "standings_tournamentId_groupId_position_idx" ON "standings"("tournamentId", "groupId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "standings_tournamentId_groupId_teamId_key" ON "standings"("tournamentId", "groupId", "teamId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "announcements_tournamentId_isPublished_idx" ON "announcements"("tournamentId", "isPublished");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "player_profiles" ADD CONSTRAINT "player_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sport_templates" ADD CONSTRAINT "sport_templates_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_templates" ADD CONSTRAINT "tournament_templates_sportTemplateId_fkey" FOREIGN KEY ("sportTemplateId") REFERENCES "sport_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "tournament_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_groups" ADD CONSTRAINT "tournament_groups_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_admins" ADD CONSTRAINT "tournament_admins_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_admins" ADD CONSTRAINT "tournament_admins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "tournament_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "tournament_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_games" ADD CONSTRAINT "match_games_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineup_slots" ADD CONSTRAINT "lineup_slots_lineupId_fkey" FOREIGN KEY ("lineupId") REFERENCES "match_lineups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lineup_slots" ADD CONSTRAINT "lineup_slots_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "tournament_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standings" ADD CONSTRAINT "standings_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
