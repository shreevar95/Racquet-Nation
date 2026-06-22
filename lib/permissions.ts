import { prisma } from '@/lib/prisma'

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformRole: true },
  })
  return user?.platformRole === 'PLATFORM_ADMIN'
}

export async function isTournamentAdmin(userId: string, tournamentId: string): Promise<boolean> {
  if (await isPlatformAdmin(userId)) return true
  const admin = await prisma.tournamentAdmin.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  })
  return !!admin
}

export async function canManageTournament(userId: string, tournamentId: string): Promise<boolean> {
  return isTournamentAdmin(userId, tournamentId)
}

export async function canApproveRegistrations(
  userId: string,
  tournamentId: string,
): Promise<boolean> {
  return isTournamentAdmin(userId, tournamentId)
}

export async function canEnterScores(userId: string, tournamentId: string): Promise<boolean> {
  if (await isPlatformAdmin(userId)) return true
  const admin = await prisma.tournamentAdmin.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  })
  return !!admin // Both ADMIN and SCORER roles can enter scores
}

export async function isTournamentCaptain(userId: string, tournamentId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { playerProfile: { select: { id: true } } },
  })
  if (!user?.playerProfile) return false

  const membership = await prisma.teamMembership.findFirst({
    where: {
      playerId: user.playerProfile.id,
      role: 'CAPTAIN',
      team: { tournamentId },
    },
  })
  return !!membership
}

export async function isTeamCaptain(userId: string, teamId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { playerProfile: { select: { id: true } } },
  })
  if (!user?.playerProfile) return false

  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_playerId: { teamId, playerId: user.playerProfile.id } },
    select: { role: true },
  })
  return membership?.role === 'CAPTAIN'
}

export async function canSubmitLineup(
  userId: string,
  matchId: string,
  teamId: string,
): Promise<boolean> {
  if (await isPlatformAdmin(userId)) return true

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { tournamentId: true, homeTeamId: true, awayTeamId: true, status: true },
  })
  if (!match) return false
  if (match.homeTeamId !== teamId && match.awayTeamId !== teamId) return false

  // Tournament admins can always submit
  const isTAdmin = await isTournamentAdmin(userId, match.tournamentId)
  if (isTAdmin) return true

  // Captains only during OPEN_FOR_SUBMISSION or TIEBREAK_REQUIRED
  if (
    match.status !== 'OPEN_FOR_SUBMISSION' &&
    match.status !== 'TIEBREAK_REQUIRED'
  ) {
    return false
  }

  return isTeamCaptain(userId, teamId)
}

export type LineupVisibility = 'HIDDEN' | 'OWN_ONLY' | 'VISIBLE'

export async function getLineupVisibility(
  matchId: string,
  requesterId: string | null,
): Promise<LineupVisibility> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      tournamentId: true,
      homeTeamId: true,
      awayTeamId: true,
      status: true,
      lineups: { select: { isVisible: true } },
    },
  })
  if (!match) return 'HIDDEN'

  // Lineups are visible once locked by admin (isVisible = true on both)
  const allVisible = match.lineups.every((l) => l.isVisible)
  if (allVisible && match.lineups.length > 0) return 'VISIBLE'

  if (!requesterId) return 'HIDDEN'

  // Platform/tournament admins see all
  if (await isPlatformAdmin(requesterId)) return 'VISIBLE'
  if (await isTournamentAdmin(requesterId, match.tournamentId)) return 'VISIBLE'

  // Captains see their own lineup only
  const isHome = await isTeamCaptain(requesterId, match.homeTeamId)
  const isAway = await isTeamCaptain(requesterId, match.awayTeamId)
  if (isHome || isAway) return 'OWN_ONLY'

  return 'HIDDEN'
}

export async function canViewLineup(
  matchId: string,
  teamId: string,
  requesterId: string | null,
): Promise<boolean> {
  const visibility = await getLineupVisibility(matchId, requesterId)
  if (visibility === 'VISIBLE') return true
  if (visibility === 'HIDDEN') return false

  // OWN_ONLY — check if requester's team matches requested team
  if (!requesterId) return false
  return isTeamCaptain(requesterId, teamId)
}
