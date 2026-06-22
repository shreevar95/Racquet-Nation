import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatDate, formatTime } from '@/lib/utils'
import { auth } from '@clerk/nextjs/server'
import { getLineupVisibility } from '@/lib/permissions'
import { prisma as db } from '@/lib/prisma'
import { getGameTypeLabel } from '@/lib/gameTypes'

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

export default async function MatchPage({ params }: Props) {
  const { slug } = await params
  const { userId: clerkId } = await auth()

  const match = await prisma.match.findUnique({
    where: { slug },
    include: {
      homeTeam: { select: { id: true, name: true, slug: true, logoUrl: true } },
      awayTeam: { select: { id: true, name: true, slug: true, logoUrl: true } },
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Breadcrumb + admin edit */}
      <div className="flex items-center justify-between">
        <Link href={`/tournaments/${match.tournament.slug}/schedule`} className="text-sm text-brand-400 hover:text-brand-300">
          ← {match.tournament.name}
        </Link>
        {canEdit && (
          <Link
            href={`/manage/${match.tournament.slug}/scoring/${match.id}`}
            className="text-xs font-bold text-brand-400 hover:text-brand-300 border border-brand-500/40 rounded-md px-3 py-1.5 transition-colors"
          >
            Edit Scores
          </Link>
        )}
      </div>

      {/* Scoreboard */}
      <div className="rounded-xl border border-border bg-surface-raised p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          {/* Home */}
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="h-12 w-12 rounded-xl border border-border bg-surface-overlay flex items-center justify-center">
              <span className="text-sm font-black text-text-muted">
                {match.homeTeam.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <p className="text-sm font-bold text-text-primary text-center leading-tight">
              {match.homeTeam.name}
            </p>
          </div>

          {/* Score */}
          <div className="text-center space-y-1">
            {match.status === 'COMPLETED' ? (
              <div className="flex items-center gap-2">
                <span className={['text-4xl font-black tabular-nums', match.winnerId === match.homeTeamId ? 'text-text-primary' : 'text-text-muted'].join(' ')}>
                  {match.homeTeamScore}
                </span>
                <span className="text-text-muted font-light">—</span>
                <span className={['text-4xl font-black tabular-nums', match.winnerId === match.awayTeamId ? 'text-text-primary' : 'text-text-muted'].join(' ')}>
                  {match.awayTeamScore}
                </span>
              </div>
            ) : (
              <p className="text-text-muted text-sm">
                {match.scheduledAt
                  ? `${formatDate(match.scheduledAt)} · ${formatTime(match.scheduledAt)}`
                  : 'TBD'}
              </p>
            )}
            <Badge variant={match.status === 'COMPLETED' ? 'success' : 'default'}>
              {match.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          {/* Away */}
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="h-12 w-12 rounded-xl border border-border bg-surface-overlay flex items-center justify-center">
              <span className="text-sm font-black text-text-muted">
                {match.awayTeam.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <p className="text-sm font-bold text-text-primary text-center leading-tight">
              {match.awayTeam.name}
            </p>
          </div>
        </div>

        {/* Per-game scores */}
        {match.games.length > 0 && (
          <div className="border-t border-border pt-4">
            <p className="text-xs text-text-muted text-center mb-2">Game Scores</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {match.games.map((g) => (
                <div key={g.gameNumber} className="rounded-md bg-surface border border-border px-3 py-1.5 text-center min-w-[60px]">
                  <p className="text-xs text-text-muted">G{g.gameNumber}</p>
                  <p className="text-sm font-bold text-text-primary tabular-nums">
                    {g.homeScore}–{g.awayScore}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit lineup CTA for captains */}
      {submitLineupTeamId && (
        <Link
          href={`/lineup/${match.id}?teamId=${submitLineupTeamId}`}
          className="flex items-center justify-center gap-2 w-full rounded-lg bg-brand-500 hover:bg-brand-600 text-text-primary py-3 font-display font-bold text-sm uppercase tracking-wide transition-colors"
        >
          Submit Your Lineup
        </Link>
      )}

      {/* Lineups */}
      {visibility !== 'HIDDEN' && match.lineups.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-text-primary">Lineups</p>
          {match.lineups
            .filter((l) => visibility === 'VISIBLE' || l.teamId === match.homeTeamId || l.teamId === match.awayTeamId)
            .map((lineup) => (
              <div key={lineup.id} className="rounded-lg border border-border bg-surface-raised p-4 space-y-3">
                <p className="text-xs font-semibold text-text-muted uppercase">{lineup.team.name}</p>
                {Array.from(
                  new Set(lineup.slots.map((s) => s.gameNumber)),
                  (game) => {
                    const matchGameTypes = (match as unknown as { gameTypes?: Record<string, string> }).gameTypes ?? {}
                    const typeLabel = getGameTypeLabel(matchGameTypes[String(game)])
                    return (
                    <div key={game}>
                      <p className="text-xs text-text-muted mb-1">
                        Game {game}{typeLabel && ` · ${typeLabel}`}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {lineup.slots
                          .filter((s) => s.gameNumber === game)
                          .map((s) => (
                            <div key={s.id} className="flex items-center gap-1.5">
                              <Avatar
                                src={s.player.user.avatarUrl}
                                name={s.player.user.name}
                                size="xs"
                              />
                              <span className="text-sm text-text-primary">{s.player.user.name}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )
                  }
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
