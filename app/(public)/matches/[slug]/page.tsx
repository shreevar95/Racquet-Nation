import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { RnPageHeader } from '@/components/rn/RnPageHeader'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { formatDate, formatTime } from '@/lib/utils'
import { auth } from '@clerk/nextjs/server'
import { getLineupVisibility } from '@/lib/permissions'
import { prisma as db } from '@/lib/prisma'
import { getGameTypeLabel } from '@/lib/gameTypes'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const match = await prisma.match.findUnique({
    where: { slug },
    include: {
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  })
  if (!match) return { title: 'Match' }
  return {
    title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    openGraph: {
      title: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
    },
  }
}

export const revalidate = 30

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: 'bg-rn-blue/10 text-rn-blue',
  OPEN_FOR_SUBMISSION: 'bg-rn-blue/10 text-rn-blue',
  LOCKED: 'bg-saffron-tint text-saffron',
  IN_PROGRESS: 'bg-saffron-tint text-saffron',
  TIEBREAK_REQUIRED: 'bg-rn-yellow/20 text-ink',
  COMPLETED: 'bg-rn-green/10 text-rn-green',
}

export default async function MatchPage({ params }: Props) {
  const { slug } = await params
  const { userId: clerkId } = await auth()

  const match = await prisma.match.findUnique({
    where: { slug },
    include: {
      homeTeam: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true } },
      awayTeam: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true } },
      tournament: { select: { id: true, name: true, slug: true } },
      games: { orderBy: { gameNumber: 'asc' } },
      lineups: {
        include: {
          slots: {
            include: { player: { include: { user: { select: { name: true, avatarUrl: true } } } } },
            orderBy: [{ gameNumber: 'asc' }, { position: 'asc' }],
          },
          team: { select: { name: true, id: true } },
        },
      },
    },
  })
  if (!match) notFound()

  // Resolve requester's DB user id
  let requesterId: string | null = null
  if (clerkId) {
    const dbUser = await db.user.findUnique({
      where: { clerkId },
      select: { id: true },
    })
    requesterId = dbUser?.id ?? null
  }

  const visibility = await getLineupVisibility(match.id, requesterId)

  // Check if the current user can enter/edit scores for this tournament
  let canEdit = false
  if (requesterId) {
    const { canEnterScores } = await import('@/lib/permissions')
    canEdit = await canEnterScores(requesterId, match.tournamentId)
  }

  // Determine if the current user is a captain who needs to submit a lineup
  let submitLineupTeamId: string | null = null
  const lineupStatuses = ['OPEN_FOR_SUBMISSION', 'TIEBREAK_REQUIRED']
  if (requesterId && lineupStatuses.includes(match.status)) {
    const { isTeamCaptain: isCaptain } = await import('@/lib/permissions')
    const [isHome, isAway] = await Promise.all([
      isCaptain(requesterId, match.homeTeamId),
      isCaptain(requesterId, match.awayTeamId),
    ])
    if (isHome) submitLineupTeamId = match.homeTeamId
    else if (isAway) submitLineupTeamId = match.awayTeamId
  }

  const isCompleted = match.status === 'COMPLETED'

  return (
    <div className="min-h-screen bg-paper font-nunito text-ink">
      <RnPageHeader>
        <div className="mb-3.5 flex items-center justify-between">
          <Link
            href={`/tournaments/${match.tournament.slug}/schedule`}
            className="text-sm font-extrabold text-white/90 transition-colors hover:text-saffron"
          >
            ← {match.tournament.name}
          </Link>
          {canEdit && (
            <Link
              href={`/manage/${match.tournament.slug}/scoring/${match.id}`}
              className="rounded-md border border-white/25 px-3 py-1.5 text-xs font-extrabold text-white/90 transition-colors hover:border-saffron hover:text-saffron"
            >
              Edit Scores
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-center">
            <RnTeamTile name={match.homeTeam.name} color={match.homeTeam.primaryColor} logoUrl={match.homeTeam.logoUrl} size="lg" className="mx-auto mb-1.5" />
            <p className="text-sm font-extrabold leading-tight text-white">{match.homeTeam.name}</p>
          </div>
          <span className="text-[13px] font-extrabold tracking-[.14em] text-white/85">VS</span>
          <div className="flex-1 text-center">
            <RnTeamTile name={match.awayTeam.name} color={match.awayTeam.primaryColor} logoUrl={match.awayTeam.logoUrl} size="lg" className="mx-auto mb-1.5" />
            <p className="text-sm font-extrabold leading-tight text-white">{match.awayTeam.name}</p>
          </div>
        </div>
      </RnPageHeader>

      <div className="mx-auto max-w-2xl space-y-3 px-4 py-6">
        {/* When / Where */}
        <RnCard className="flex items-center justify-between p-3.5 text-sm">
          <span className="font-bold text-rn-text-muted">When</span>
          <span className="font-extrabold text-ink">
            {match.scheduledAt ? `${formatDate(match.scheduledAt)} · ${formatTime(match.scheduledAt)}` : 'TBD'}
          </span>
        </RnCard>
        <RnCard className="flex items-center justify-between p-3.5 text-sm">
          <span className="font-bold text-rn-text-muted">Where</span>
          <span className="font-extrabold text-ink">
            {match.court ? `${match.court} · ${match.tournament.name}` : match.tournament.name}
          </span>
        </RnCard>
        <div className="flex justify-end">
          <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide', STATUS_STYLE[match.status] ?? 'bg-rn-text-muted/10 text-rn-text-muted')}>
            {match.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Score */}
        {isCompleted && (
          <RnCard className="p-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <span className={cn('font-nunito text-4xl font-black tabular-nums', match.winnerId === match.homeTeamId ? 'text-rn-green' : 'text-rn-text-muted')}>
                {match.homeTeamScore}
              </span>
              <span className="font-light text-rn-text-muted">—</span>
              <span className={cn('font-nunito text-4xl font-black tabular-nums', match.winnerId === match.awayTeamId ? 'text-rn-green' : 'text-rn-text-muted')}>
                {match.awayTeamScore}
              </span>
            </div>

            {match.games.length > 0 && (
              <div className="mt-4 border-t border-rn-border pt-4">
                <p className="mb-2 text-center text-xs font-bold text-rn-text-muted">Game Scores</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {match.games.map((g) => (
                    <div key={g.gameNumber} className="min-w-[60px] rounded-md border border-rn-border bg-paper px-3 py-1.5 text-center">
                      <p className="text-xs text-rn-text-muted">G{g.gameNumber}</p>
                      <p className="font-nunito text-sm font-bold text-ink tabular-nums">
                        {g.homeScore}–{g.awayScore}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </RnCard>
        )}

        {/* Lineup callout for captains who still need to submit */}
        {submitLineupTeamId && (
          <RnCard className="flex items-center justify-between gap-3 border-[#f3dcd5] bg-[#fff7f4] p-3.5">
            <div>
              <p className="text-sm font-extrabold text-ink">Lineup not submitted</p>
              <p className="mt-0.5 text-xs text-[#c08672]">Sealed reveal when both lock in</p>
            </div>
            <Link
              href={`/lineup/${match.id}?teamId=${submitLineupTeamId}`}
              className="shrink-0 rounded-lg bg-rn-green px-3.5 py-2 text-xs font-extrabold text-white transition-colors hover:brightness-105"
            >
              Submit →
            </Link>
          </RnCard>
        )}

        {/* Lineups */}
        {visibility !== 'HIDDEN' && match.lineups.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-extrabold text-ink">Lineups</p>
            {match.lineups
              .filter((l) => visibility === 'VISIBLE' || l.teamId === match.homeTeamId || l.teamId === match.awayTeamId)
              .map((lineup) => (
                <RnCard key={lineup.id} className="space-y-3 p-4">
                  <p className="text-xs font-extrabold uppercase text-rn-text-muted">{lineup.team.name}</p>
                  {Array.from(
                    new Set(lineup.slots.map((s) => s.gameNumber)),
                    (game) => {
                      const matchGameTypes = (match as unknown as { gameTypes?: Record<string, string> }).gameTypes ?? {}
                      const typeLabel = getGameTypeLabel(matchGameTypes[String(game)])
                      return (
                      <div key={game}>
                        <p className="mb-1 text-xs text-rn-text-muted">
                          Game {game}{typeLabel && ` · ${typeLabel}`}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {lineup.slots
                            .filter((s) => s.gameNumber === game)
                            .map((s) => (
                              <div key={s.id} className="flex items-center gap-1.5">
                                <RnTeamTile name={s.player.user.name} logoUrl={s.player.user.avatarUrl} color="#19A463" size="sm" className="rounded-full" />
                                <span className="text-sm text-ink">{s.player.user.name}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )
                    }
                  )}
                </RnCard>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
