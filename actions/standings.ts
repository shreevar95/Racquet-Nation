'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeStandings } from '@/lib/standings-engine'
import type { StandingsConfig } from '@/types/tournament'

export async function recalculateStandings(tournamentId: string): Promise<void> {
  await requireAuth()

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      slug: true,
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

  try {
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

    revalidatePath(`/tournaments/${tournament.slug}/standings`)
    revalidatePath(`/manage/${tournament.slug}/scoring`)
  } catch (err) {
    console.error('[recalculateStandings]', err)
    throw err
  }
}
