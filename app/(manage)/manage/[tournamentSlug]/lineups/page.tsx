import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament } from '@/lib/permissions'
import { RnCard } from '@/components/rn/RnCard'
import { formatDate, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { LineupControls } from './LineupControls'
import { OpenAllButton } from './OpenAllButton'

interface Props {
  params: Promise<{ tournamentSlug: string }>
}

export const metadata: Metadata = { title: 'Lineups' }

const STATUS_STYLE: Record<string, string> = {
  LOCKED: 'bg-rn-yellow/20 text-ink',
  OPEN_FOR_SUBMISSION: 'bg-rn-blue/10 text-rn-blue',
  UPCOMING: 'bg-rn-text-muted/10 text-rn-text-muted',
}

export default async function LineupsPage({ params }: Props) {
  const { tournamentSlug } = await params
  const user = await requireAuth()

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    include: {
      matches: {
        where: { status: { in: ['UPCOMING', 'OPEN_FOR_SUBMISSION', 'LOCKED'] } },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
          lineups: {
            select: {
              teamId: true,
              isLocked: true,
              submittedAt: true,
              team: { select: { name: true } },
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      },
    },
  })
  if (!tournament) notFound()
  if (!(await canManageTournament(user.id, tournament.id))) notFound()

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-nunito text-xl font-black text-ink">Lineups</h1>
          <p className="text-sm text-rn-text-secondary">{tournament.name}</p>
        </div>
        <OpenAllButton
          tournamentId={tournament.id}
          upcomingCount={tournament.matches.filter((m) => m.status === 'UPCOMING').length}
        />
      </div>

      <div className="space-y-3">
        {tournament.matches.map((match) => {
          const homeLineup = match.lineups.find((l) => l.teamId === match.homeTeamId)
          const awayLineup = match.lineups.find((l) => l.teamId === match.awayTeamId)

          return (
            <RnCard key={match.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-ink">
                    {match.homeTeam.name} vs {match.awayTeam.name}
                  </p>
                  {match.scheduledAt && (
                    <p className="text-xs text-rn-text-muted">
                      {formatDate(match.scheduledAt)} {formatTime(match.scheduledAt)}
                    </p>
                  )}
                </div>
                <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide', STATUS_STYLE[match.status] ?? 'bg-rn-text-muted/10 text-rn-text-muted')}>
                  {match.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Lineup status per team */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { team: match.homeTeam, lineup: homeLineup },
                  { team: match.awayTeam, lineup: awayLineup },
                ].map(({ team, lineup }) => (
                  <div
                    key={team.name}
                    className={cn(
                      'rounded-lg border p-2 text-xs',
                      lineup?.isLocked
                        ? 'border-rn-yellow/40 bg-rn-yellow/15'
                        : lineup
                          ? 'border-rn-green/30 bg-rn-green/10'
                          : 'border-rn-border bg-paper',
                    )}
                  >
                    <p className="font-bold text-ink">{team.name}</p>
                    <p className={lineup ? 'font-bold text-rn-green' : 'text-rn-text-muted'}>
                      {lineup?.isLocked
                        ? 'Locked'
                        : lineup
                          ? `Submitted ${formatTime(lineup.submittedAt)}`
                          : 'Not submitted'}
                    </p>
                  </div>
                ))}
              </div>

              <LineupControls
                matchId={match.id}
                status={match.status}
                bothSubmitted={
                  match.lineups.length === 2 && match.lineups.every((l) => !l.isLocked)
                }
                allLocked={match.lineups.every((l) => l.isLocked) && match.lineups.length === 2}
              />
            </RnCard>
          )
        })}

        {tournament.matches.length === 0 && (
          <RnCard className="border-dashed p-8 text-center">
            <p className="text-sm text-rn-text-muted">No upcoming matches require lineup management.</p>
          </RnCard>
        )}
      </div>
    </div>
  )
}
