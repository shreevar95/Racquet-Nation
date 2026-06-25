import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canSubmitLineup } from '@/lib/permissions'
import { RnPageHeader } from '@/components/rn/RnPageHeader'
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
    <div className="min-h-screen bg-paper font-nunito text-ink">
      <RnPageHeader
        backHref="/dashboard"
        eyebrow={`${isEdit ? 'EDIT' : 'SUBMIT'} LINEUP · ${team.name}`}
        title={
          <>
            {match.homeTeam.name} <span className="text-[13px] font-extrabold tracking-[.14em] text-white/70">VS</span>{' '}
            {match.awayTeam.name}
          </>
        }
        className="pb-6"
      />

      <div className="mx-auto max-w-lg px-4 py-5 md:max-w-3xl">
        {isEdit && (
          <p className="mb-4 text-xs font-semibold text-rn-text-secondary">
            You can update your lineup until the admin closes the submission window.
          </p>
        )}

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
    </div>
  )
}
