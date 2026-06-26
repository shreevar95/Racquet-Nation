import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament } from '@/lib/permissions'
import { RnCard } from '@/components/rn/RnCard'
import { formatDate, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { GenerateScheduleButton } from './GenerateScheduleButton'
import { GenerateFinalButton } from './GenerateFinalButton'
import { ScheduleMatchButton } from './ScheduleMatchButton'
import { OpenForLineupButton } from './OpenForLineupButton'
import { MatchActionsWrapper } from './MatchActionsWrapper'

interface Props {
  params: Promise<{ tournamentSlug: string }>
}

export const metadata: Metadata = { title: 'Schedule' }

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: 'bg-rn-text-muted/10 text-rn-text-muted',
  OPEN_FOR_SUBMISSION: 'bg-rn-blue/10 text-rn-blue',
  LOCKED: 'bg-rn-yellow/20 text-ink',
  IN_PROGRESS: 'bg-saffron-tint text-saffron',
  COMPLETED: 'bg-rn-green/10 text-rn-green',
  TIEBREAK_REQUIRED: 'bg-rn-yellow/20 text-ink',
}

interface MatchRowData {
  id: string
  status: string
  scheduledAt: Date | null
  court: string | null
  homeTeamId: string
  awayTeamId: string
  winnerId: string | null
  homeTeamScore: number | null
  awayTeamScore: number | null
  homeTeam: { name: string }
  awayTeam: { name: string }
}

function MatchRow({ match, tournamentSlug }: { match: MatchRowData; tournamentSlug: string }) {
  const isCompleted = match.status === 'COMPLETED'
  const homeWon = match.winnerId === match.homeTeamId

  return (
    <Link href={`/manage/${tournamentSlug}/scoring/${match.id}`}>
      <RnCard className="rn-card-hover flex items-center justify-between gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">
            {isCompleted && match.homeTeamScore !== null && match.awayTeamScore !== null ? (
              <>
                <span className={homeWon ? 'font-black text-rn-green' : ''}>
                  {match.homeTeam.name}
                </span>
                <span className="mx-1.5 font-black tabular-nums text-rn-text-secondary">
                  {match.homeTeamScore} — {match.awayTeamScore}
                </span>
                <span className={!homeWon ? 'font-black text-rn-green' : ''}>
                  {match.awayTeam.name}
                </span>
              </>
            ) : (
              <>{match.homeTeam.name} vs {match.awayTeam.name}</>
            )}
          </p>
          {match.scheduledAt ? (
            <p className="mt-0.5 text-xs text-rn-text-muted">
              {formatDate(match.scheduledAt)} {formatTime(match.scheduledAt)}
              {match.court && ` · ${match.court}`}
            </p>
          ) : (
            <p className="text-xs text-rn-text-muted">Not scheduled</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide', STATUS_STYLE[match.status] ?? 'bg-rn-text-muted/10 text-rn-text-muted')}>
            {match.status.replace(/_/g, ' ')}
          </span>
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
        </div>
      </RnCard>
    </Link>
  )
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
    <div className="space-y-8 pt-6">
      <div>
        <h1 className="font-nunito text-xl font-black text-ink">Schedule</h1>
        <p className="text-sm text-rn-text-secondary">{tournament.name}</p>
      </div>

      {groupStageGroups.map((group) => (
        <div key={group.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">
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
            <p className="text-sm text-rn-text-muted">No matches generated yet.</p>
          ) : (
            <div className="space-y-2">
              {group.matches.map((match) => (
                <MatchRow key={match.id} match={match} tournamentSlug={tournamentSlug} />
              ))}
            </div>
          )}
        </div>
      ))}

      {hasFinalStage && (
        <div className="space-y-3 border-t border-rn-border pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">
                Final Stage
              </p>
              <p className="mt-0.5 text-xs text-rn-text-secondary">
                {fmt?.knockoutType === 'BRACKET' ? 'Elimination bracket' : 'Round-robin final'}
              </p>
            </div>
            {(!finalGroup || finalGroup.matches.length === 0) && (
              <GenerateFinalButton tournamentId={tournament.id} />
            )}
          </div>

          {!finalGroup ? (
            <p className="text-sm text-rn-text-muted">
              Generate the final schedule once group stage standings are set.
            </p>
          ) : finalGroup.matches.length === 0 ? (
            <p className="text-sm text-rn-text-muted">Final schedule not yet generated.</p>
          ) : (
            <div className="space-y-2">
              {finalGroup.matches.map((match) => (
                <MatchRow key={match.id} match={match} tournamentSlug={tournamentSlug} />
              ))}
            </div>
          )}
        </div>
      )}

      {groups.length === 0 && (
        <p className="text-sm text-rn-text-muted">No groups found for this tournament.</p>
      )}
    </div>
  )
}
