'use server'

import { prisma } from '@/lib/prisma'
import { computeStandings } from '@/lib/standings-engine'
import type { StandingsConfig } from '@/types/tournament'

export async function recalculateStandings(tournamentId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      standingsConfig: true,
      groups: {
        include: {
          teams: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
          matches: {
            where: { status: 'COMPLETED' },
            select: {
              homeTeamId: true,
              awayTeamId: true,
              homeTeamScore: true,
              awayTeamScore: true,
              winnerId: true,
            },
          },
        },
      },
    },
  })
  if (!tournament) return

  const config = tournament.standingsConfig as unknown as StandingsConfig

  for (const group of tournament.groups) {
    const completedMatches = group.matches.filter(
      (m) => m.homeTeamScore !== null && m.awayTeamScore !== null,
    ) as Array<{
      homeTeamId: string
      awayTeamId: string
      homeTeamScore: number
      awayTeamScore: number
      winnerId: string | null
    }>

    const rows = computeStandings(group.teams, completedMatches, config)

    // Upsert all standings rows for this group
    await Promise.all(
      rows.map((row) =>
        prisma.standings.upsert({
          where: {
            tournamentId_groupId_teamId: {
              tournamentId,
              groupId: group.id,
              teamId: row.teamId,
            },
          },
          update: {
            position: row.position,
            matchesPlayed: row.matchesPlayed,
            matchesWon: row.matchesWon,
            matchesLost: row.matchesLost,
            matchesDrawn: row.matchesDrawn,
            gamesWon: row.gamesWon,
            gamesLost: row.gamesLost,
            gameDifferential: row.gameDifferential,
            points: row.points,
          },
          create: {
            tournamentId,
            groupId: group.id,
            teamId: row.teamId,
            position: row.position,
            matchesPlayed: row.matchesPlayed,
            matchesWon: row.matchesWon,
            matchesLost: row.matchesLost,
            matchesDrawn: row.matchesDrawn,
            gamesWon: row.gamesWon,
            gamesLost: row.gamesLost,
            gameDifferential: row.gameDifferential,
            points: row.points,
          },
        }),
      ),
    )
  }
}
