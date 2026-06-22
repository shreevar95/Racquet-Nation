import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime } from '@/lib/utils'
import { LineupControls } from './LineupControls'
import { OpenAllButton } from './OpenAllButton'

interface Props {
  params: Promise<{ tournamentSlug: string }>
}

export const metadata: Metadata = { title: 'Lineups' }

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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Lineups</h1>
          <p className="text-sm text-text-secondary">{tournament.name}</p>
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
            <div key={match.id} className="rounded-lg border border-border bg-surface-raised p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-text-primary">
                    {match.homeTeam.name} vs {match.awayTeam.name}
                  </p>
                  {match.scheduledAt && (
                    <p className="text-xs text-text-muted">
                      {formatDate(match.scheduledAt)} {formatTime(match.scheduledAt)}
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    match.status === 'LOCKED'
                      ? 'warning'
                      : match.status === 'OPEN_FOR_SUBMISSION'
                        ? 'info'
                        : 'default'
                  }
                >
                  {match.status.replace(/_/g, ' ')}
                </Badge>
              </div>

              {/* Lineup status per team */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { team: match.homeTeam, lineup: homeLineup },
                  { team: match.awayTeam, lineup: awayLineup },
                ].map(({ team, lineup }) => (
                  <div
                    key={team.name}
                    className={[
                      'rounded-md p-2 text-xs border',
                      lineup?.isLocked
                        ? 'border-warning/30 bg-warning-bg'
                        : lineup
                          ? 'border-success/30 bg-success-bg'
                          : 'border-border bg-surface',
                    ].join(' ')}
                  >
                    <p className="font-medium text-text-primary">{team.name}</p>
                    <p className={lineup ? 'text-success' : 'text-text-muted'}>
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
            </div>
          )
        })}

        {tournament.matches.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-text-muted text-sm">No upcoming matches require lineup management.</p>
          </div>
        )}
      </div>
    </div>
  )
}
