import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament } from '@/lib/permissions'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime } from '@/lib/utils'
import { GenerateScheduleButton } from './GenerateScheduleButton'
import { GenerateFinalButton } from './GenerateFinalButton'
import { ScheduleMatchButton } from './ScheduleMatchButton'
import { OpenForLineupButton } from './OpenForLineupButton'
import { MatchActionsWrapper } from './MatchActionsWrapper'

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
    select: { id: true, name: true, slug: true, matchFormat: true },
  })
  if (!tournament) notFound()
  if (!(await canManageTournament(user.id, tournament.id))) notFound()

  const groups = await prisma.tournamentGroup.findMany({
    where: { tournamentId: tournament.id },
    orderBy: { order: 'asc' },
    include: {
      matches: {
        orderBy: { matchNumber: 'asc' },
        include: {
          homeTeam: { select: { id: true, name: true, slug: true } },
          awayTeam: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  })

  const fmt = tournament.matchFormat as { tournamentStructure?: string; knockoutType?: string } | null
  const hasFinalStage = fmt?.tournamentStructure === 'GROUP_STAGE_PLUS_KNOCKOUT'
  const groupStageGroups = groups.filter((g) => g.name !== 'Final')
  const finalGroup = groups.find((g) => g.name === 'Final')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Schedule</h1>
        <p className="text-sm text-text-secondary">{tournament.name}</p>
      </div>

      {groupStageGroups.map((group) => (
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
              {group.matches.map((match) => {
                const isCompleted = match.status === 'COMPLETED'
                const homeWon = match.winnerId === match.homeTeamId
                return (
                  <Link
                    key={match.id}
                    href={`/manage/${tournamentSlug}/scoring/${match.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 gap-3 hover:border-brand-500/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate group-hover:text-brand-300 transition-colors">
                        {isCompleted && match.homeTeamScore !== null && match.awayTeamScore !== null ? (
                          <>
                            <span className={homeWon ? 'text-brand-400 font-black' : ''}>
                              {match.homeTeam.name}
                            </span>
                            <span className="mx-1.5 tabular-nums font-black text-text-secondary">
                              {match.homeTeamScore} — {match.awayTeamScore}
                            </span>
                            <span className={!homeWon ? 'text-brand-400 font-black' : ''}>
                              {match.awayTeam.name}
                            </span>
                          </>
                        ) : (
                          <>{match.homeTeam.name} vs {match.awayTeam.name}</>
                        )}
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
                        <MatchActionsWrapper>
                          <ScheduleMatchButton
                            matchId={match.id}
                            currentDate={match.scheduledAt?.toISOString() ?? null}
                            currentCourt={match.court}
                          />
                          <OpenForLineupButton matchId={match.id} />
                        </MatchActionsWrapper>
                      )}
                      <span className="text-text-muted group-hover:text-brand-400 transition-colors">›</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      ))}

      {hasFinalStage && (
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Final Stage
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {fmt?.knockoutType === 'BRACKET' ? 'Elimination bracket' : 'Round-robin final'}
              </p>
            </div>
            {(!finalGroup || finalGroup.matches.length === 0) && (
              <GenerateFinalButton tournamentId={tournament.id} />
            )}
          </div>

          {!finalGroup ? (
            <p className="text-sm text-text-muted">
              Generate the final schedule once group stage standings are set.
            </p>
          ) : finalGroup.matches.length === 0 ? (
            <p className="text-sm text-text-muted">Final schedule not yet generated.</p>
          ) : (
            <div className="space-y-2">
              {finalGroup.matches.map((match) => {
                const isCompleted = match.status === 'COMPLETED'
                const homeWon = match.winnerId === match.homeTeamId
                return (
                  <Link
                    key={match.id}
                    href={`/manage/${tournamentSlug}/scoring/${match.id}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 gap-3 hover:border-brand-500/50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate group-hover:text-brand-300 transition-colors">
                        {isCompleted && match.homeTeamScore !== null && match.awayTeamScore !== null ? (
                          <>
                            <span className={homeWon ? 'text-brand-400 font-black' : ''}>
                              {match.homeTeam.name}
                            </span>
                            <span className="mx-1.5 tabular-nums font-black text-text-secondary">
                              {match.homeTeamScore} — {match.awayTeamScore}
                            </span>
                            <span className={!homeWon ? 'text-brand-400 font-black' : ''}>
                              {match.awayTeam.name}
                            </span>
                          </>
                        ) : (
                          <>{match.homeTeam.name} vs {match.awayTeam.name}</>
                        )}
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
                        <MatchActionsWrapper>
                          <ScheduleMatchButton
                            matchId={match.id}
                            currentDate={match.scheduledAt?.toISOString() ?? null}
                            currentCourt={match.court}
                          />
                          <OpenForLineupButton matchId={match.id} />
                        </MatchActionsWrapper>
                      )}
                      <span className="text-text-muted group-hover:text-brand-400 transition-colors">›</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}

      {groups.length === 0 && (
        <p className="text-sm text-text-muted">No groups found for this tournament.</p>
      )}
    </div>
  )
}
