import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canSubmitLineup } from '@/lib/permissions'
import { LineupSubmitForm } from './LineupSubmitForm'

interface Props {
  params: Promise<{ matchId: string }>
  searchParams: Promise<{ teamId?: string }>
}

export const metadata: Metadata = { title: 'Submit Lineup' }

export default async function LineupPage({ params, searchParams }: Props) {
  const { matchId } = await params
  const { teamId } = await searchParams
  const user = await requireAuth()

  if (!teamId) redirect('/dashboard')

  if (!(await canSubmitLineup(user.id, matchId, teamId))) {
    redirect('/dashboard')
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      tournament: { select: { matchFormat: true, name: true } },
    },
  })

  if (!match) notFound()

  const team = match.homeTeamId === teamId ? match.homeTeam : match.awayTeam

  // Get team roster — ordered for deterministic slot assignment
  const roster = await prisma.teamMembership.findMany({
    where: { teamId },
    include: {
      player: { include: { user: { select: { name: true, avatarUrl: true } } } },
    },
    orderBy: { joinedAt: 'asc' },
  })

  // Existing lineup if already submitted
  const existingLineup = await prisma.matchLineup.findUnique({
    where: { matchId_teamId: { matchId, teamId } },
    include: { slots: true },
  })

  const matchFormat = match.tournament.matchFormat as { gamesPerMatch: number; playersPerSide: number; gameTypes?: Record<string, string> }
  const gameTypes = (match.gameTypes as Record<string, string> | null) ?? matchFormat.gameTypes ?? {}

  const isEdit = !!existingLineup

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-text-primary">
          {isEdit ? 'Edit Lineup' : 'Submit Lineup'}
        </h1>
        <p className="text-sm text-text-secondary">
          {team.name} · {match.tournament.name}
        </p>
        <p className="text-xs text-text-muted mt-0.5">
          {match.homeTeam.name} vs {match.awayTeam.name}
        </p>
        {isEdit && (
          <p className="text-xs text-brand-400 mt-1">
            You can update your lineup until the admin closes the submission window.
          </p>
        )}
      </div>

      <LineupSubmitForm
        matchId={matchId}
        teamId={teamId}
        gamesPerMatch={matchFormat.gamesPerMatch}
        playersPerSide={matchFormat.playersPerSide}
        gameTypes={gameTypes}
        roster={roster.map((m) => ({
          playerId: m.playerId,
          name: m.player.user.name,
          avatarUrl: m.player.user.avatarUrl,
          rating: m.player.selfRating,
          gender: m.player.gender as string | null,
        }))}
        existingSlots={existingLineup?.slots ?? []}
      />
    </div>
  )
}
