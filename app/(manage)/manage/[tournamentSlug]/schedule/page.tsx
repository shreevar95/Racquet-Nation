import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime } from '@/lib/utils'
import { GenerateScheduleButton } from './GenerateScheduleButton'
import { ScheduleMatchButton } from './ScheduleMatchButton'

interface Props {
  params: Promise<{ tournamentSlug: string }>
}

export const metadata: Metadata = { title: 'Schedule' }

const STATUS_VARIANT: Record<string, 'default' | 'info' | 'warning' | 'success' | 'brand'> = {
  UPCOMING: 'default',
  OPEN_FOR_SUBMISSION: 'info',
  LOCKED: 'warning',
  IN_PROGRESS: 'brand',
  COMPLETED: 'success',
  TIEBREAK_REQUIRED: 'warning',
}

export default async function SchedulePage({ params }: Props) {
  const { tournamentSlug } = await params
  const user = await requireAuth()

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    include: {
      groups: {
        include: {
          matches: {
            include: {
              homeTeam: { select: { name: true, slug: true } },
              awayTeam: { select: { name: true, slug: true } },
            },
            orderBy: { matchNumber: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  })
  if (!tournament) notFound()
  if (!(await canManageTournament(user.id, tournament.id))) notFound()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Schedule</h1>
        <p className="text-sm text-text-secondary">{tournament.name}</p>
      </div>

      {tournament.groups.map((group) => (
        <div key={group.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              {group.name}
            </p>
            {group.matches.length === 0 && (
              <GenerateScheduleButton
                tournamentId={tournament.id}
                groupId={group.id}
                groupName={group.name}
              />
            )}
          </div>

          {group.matches.length === 0 ? (
            <p className="text-sm text-text-muted">No matches generated yet.</p>
          ) : (
            <div className="space-y-2">
              {group.matches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {match.homeTeam.name} vs {match.awayTeam.name}
                    </p>
                    {match.scheduledAt ? (
                      <p className="text-xs text-text-muted mt-0.5">
                        {formatDate(match.scheduledAt)} {formatTime(match.scheduledAt)}
                        {match.court && ` · ${match.court}`}
                      </p>
                    ) : (
                      <p className="text-xs text-text-muted">Not scheduled</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={STATUS_VARIANT[match.status] ?? 'default'}>
                      {match.status.replace(/_/g, ' ')}
                    </Badge>
                    {match.status === 'UPCOMING' && (
                      <ScheduleMatchButton
                        matchId={match.id}
                        currentDate={match.scheduledAt?.toISOString() ?? null}
                        currentCourt={match.court}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
