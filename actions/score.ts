'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { canEnterScores } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { recalculateStandings } from '@/actions/standings'
import { pushToTournamentPlayers } from '@/lib/push'
import { z } from 'zod'

const GameScoreSchema = z.object({
  gameNumber: z.number().int().min(1),
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
})

const EnterScoresSchema = z.object({
  matchId: z.string().min(1),
  games: z.array(GameScoreSchema).min(1),
})

export async function getMatchScores(
  matchId: string,
): Promise<{ games: { gameNumber: number; homeScore: number; awayScore: number }[] }> {
  const games = await prisma.matchGame.findMany({
    where: { matchId },
    select: { gameNumber: true, homeScore: true, awayScore: true },
    orderBy: { gameNumber: 'asc' },
  })
  return {
    games: games.map((g) => ({
      gameNumber: g.gameNumber,
      homeScore: g.homeScore ?? 0,
      awayScore: g.awayScore ?? 0,
    })),
  }
}

export async function savePartialScores(
  input: z.infer<typeof EnterScoresSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = EnterScoresSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const user = await requireAuth()
  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    select: { tournamentId: true, status: true },
  })
  if (!match) return { success: false, error: 'Match not found' }
  if (!(await canEnterScores(user.id, match.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  // Upsert game records without determining winners
  await Promise.all(
    parsed.data.games.map((g) =>
      prisma.matchGame.upsert({
        where: { matchId_gameNumber: { matchId: parsed.data.matchId, gameNumber: g.gameNumber } },
        update: { homeScore: g.homeScore, awayScore: g.awayScore },
        create: { matchId: parsed.data.matchId, gameNumber: g.gameNumber, homeScore: g.homeScore, awayScore: g.awayScore },
      }),
    ),
  )

  // Advance to IN_PROGRESS only if match hasn't been completed yet
  if (match.status === 'UPCOMING' || match.status === 'OPEN_FOR_SUBMISSION' || match.status === 'LOCKED') {
    await prisma.match.update({
      where: { id: parsed.data.matchId },
      data: { status: 'IN_PROGRESS' },
    })
  }

  return { success: true }
}

export async function enterMatchScores(
  input: z.infer<typeof EnterScoresSchema>,
): Promise<{ success: boolean; requiresTiebreak?: boolean; error?: string }> {
  const parsed = EnterScoresSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }

  const user = await requireAuth()
  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    include: {
      tournament: { select: { matchFormat: true, standingsConfig: true, slug: true, name: true } },
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  })
  if (!match) return { success: false, error: 'Match not found' }
  if (!(await canEnterScores(user.id, match.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  const rawFormat = match.tournament.matchFormat as { gamesPerMatch?: number; tiebreakEnabled?: boolean } | null
  const matchFormat = {
    gamesPerMatch: rawFormat?.gamesPerMatch ?? 4,
    tiebreakEnabled: rawFormat?.tiebreakEnabled ?? false,
  }

  // Determine winner per game
  let homeTeamScore = 0
  let awayTeamScore = 0
  const gameUpdates = parsed.data.games.map((g) => {
    const winnerId =
      g.homeScore > g.awayScore
        ? match.homeTeamId
        : g.awayScore > g.homeScore
          ? match.awayTeamId
          : null
    if (winnerId === match.homeTeamId) homeTeamScore++
    else if (winnerId === match.awayTeamId) awayTeamScore++
    return { ...g, winnerId }
  })

  // Upsert game records
  await Promise.all(
    gameUpdates.map((g) =>
      prisma.matchGame.upsert({
        where: { matchId_gameNumber: { matchId: parsed.data.matchId, gameNumber: g.gameNumber } },
        update: { homeScore: g.homeScore, awayScore: g.awayScore, winnerId: g.winnerId },
        create: {
          matchId: parsed.data.matchId,
          gameNumber: g.gameNumber,
          homeScore: g.homeScore,
          awayScore: g.awayScore,
          winnerId: g.winnerId,
        },
      }),
    ),
  )

  // Determine match winner
  const requiresTiebreak =
    matchFormat.tiebreakEnabled &&
    homeTeamScore === awayTeamScore &&
    parsed.data.games.length === matchFormat.gamesPerMatch

  const matchWinnerId =
    homeTeamScore > awayTeamScore
      ? match.homeTeamId
      : awayTeamScore > homeTeamScore
        ? match.awayTeamId
        : null

  // If all games have been submitted via the Confirm button, the match is resolved.
  // A draw (no matchWinnerId) with no tiebreak enabled still counts as COMPLETED.
  const allGamesSubmitted = parsed.data.games.length >= matchFormat.gamesPerMatch
  const newStatus = requiresTiebreak
    ? 'TIEBREAK_REQUIRED'
    : allGamesSubmitted
      ? 'COMPLETED'
      : matchWinnerId
        ? 'COMPLETED'
        : 'IN_PROGRESS'

  await prisma.match.update({
    where: { id: parsed.data.matchId },
    data: {
      homeTeamScore,
      awayTeamScore,
      winnerId: matchWinnerId,
      isTiebreak: requiresTiebreak,
      status: newStatus,
      ...(newStatus === 'COMPLETED' && { completedAt: new Date() }),
    },
  })

  // Recalculate standings + push result if completed
  if (newStatus === 'COMPLETED') {
    await recalculateStandings(match.tournamentId)
    const resultLine =
      matchWinnerId
        ? `${homeTeamScore > awayTeamScore ? match.homeTeam.name : match.awayTeam.name} wins ${homeTeamScore}–${awayTeamScore}`
        : `Draw ${homeTeamScore}–${awayTeamScore}`
    await pushToTournamentPlayers(match.tournamentId, {
      title: `Result — ${match.homeTeam.name} vs ${match.awayTeam.name}`,
      body: `${resultLine}. Standings updated.`,
      url: `/tournaments/${match.tournament.slug}/results`,
      tag: `result-${match.id}`,
    })
  }

  revalidatePath(`/manage/${match.tournament.slug}/scoring`)
  revalidatePath(`/tournaments/${match.tournament.slug}/standings`)
  revalidatePath(`/tournaments/${match.tournament.slug}/results`)

  return { success: true, requiresTiebreak }
}
