import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canEnterScores } from '@/lib/permissions'
import { ScoreEntryForm } from './ScoreEntryForm'

interface Props {
  params: Promise<{ tournamentSlug: string; matchId: string }>
}

export const metadata: Metadata = { title: 'Enter Scores' }

export default async function ScoreEntryPage({ params }: Props) {
  const { tournamentSlug, matchId } = await params
  const user = await requireAuth()

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      tournament: {
        select: {
          matchFormat: true,
          scoringConfig: true,
          name: true,
          slug: true,
        },
      },
      games: { orderBy: { gameNumber: 'asc' } },
    },
  })
  if (!match) notFound()
  if (!(await canEnterScores(user.id, match.tournamentId))) notFound()

  const rawFormat = match.tournament.matchFormat as { gamesPerMatch?: number; tiebreakEnabled?: boolean } | null
  const rawScoring = match.tournament.scoringConfig as { pointsToWin?: number } | null
  const gamesPerMatch = rawFormat?.gamesPerMatch ?? 4
  const tiebreakEnabled = rawFormat?.tiebreakEnabled ?? false
  const pointsToWin = rawScoring?.pointsToWin ?? 11

  return (
    <ScoreEntryForm
      matchId={match.id}
      tournamentSlug={match.tournament.slug}
      homeTeam={match.homeTeam}
      awayTeam={match.awayTeam}
      gamesPerMatch={gamesPerMatch}
      tiebreakEnabled={tiebreakEnabled}
      pointsToWin={pointsToWin}
      existingGames={match.games.map((g) => ({
        gameNumber: g.gameNumber,
        homeScore: g.homeScore ?? 0,
        awayScore: g.awayScore ?? 0,
      }))}
    />
  )
}
