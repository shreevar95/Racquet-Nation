import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = { title: 'Schedule' }

export default async function PublicSchedulePage({ params }: Props) {
  const { slug } = await params
  const { userId: clerkId } = await auth()

  const tournament = await prisma.tournament.findUnique({
    where: { slug, isPublic: true },
    select: { id: true },
  })
  if (!tournament) notFound()

  const matches = await prisma.match.findMany({
    where: { tournamentId: tournament.id },
    select: {
      id: true,
      slug: true,
      status: true,
      scheduledAt: true,
      court: true,
      homeTeamId: true,
      awayTeamId: true,
      winnerId: true,
      homeTeamScore: true,
      awayTeamScore: true,
      homeTeam: { select: { id: true, name: true, slug: true } },
      awayTeam: { select: { id: true, name: true, slug: true } },
      group: { select: { name: true } },
    },
    orderBy: [{ scheduledAt: 'asc' }, { matchNumber: 'asc' }],
  })

  // Find which teams the logged-in user captains in this tournament
  const captainTeamIds = new Set<string>()
  if (clerkId) {
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
      select: { playerProfile: { select: { id: true } } },
    })
    if (dbUser?.playerProfile) {
      const captainships = await prisma.teamMembership.findMany({
        where: {
          playerId: dbUser.playerProfile.id,
          role: 'CAPTAIN',
          team: { tournamentId: tournament.id },
        },
        select: { teamId: true },
      })
      captainships.forEach((c) => captainTeamIds.add(c.teamId))
    }
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-text-muted text-sm">Schedule not published yet.</p>
      </div>
    )
  }

  const byDate: Record<string, typeof matches> = {}
  for (const m of matches) {
    const key = m.scheduledAt ? formatDate(m.scheduledAt) : 'TBD'
    ;(byDate[key] ??= []).push(m)
  }

  const STATUS_VARIANT: Record<string, 'default' | 'brand' | 'warning' | 'info' | 'success'> = {
    UPCOMING: 'default',
    OPEN_FOR_SUBMISSION: 'info',
    LOCKED: 'brand',
    IN_PROGRESS: 'brand',
    TIEBREAK_REQUIRED: 'warning',
    COMPLETED: 'success',
  }

  // Split into upcoming and completed
  const upcomingMatches = matches.filter((m) => m.status !== 'COMPLETED')
  const completedMatches = matches.filter((m) => m.status === 'COMPLETED')

  const groupByDate = (list: typeof matches) => {
    const byDate: Record<string, typeof matches> = {}
    for (const m of list) {
      const key = m.scheduledAt ? formatDate(m.scheduledAt) : 'TBD'
      ;(byDate[key] ??= []).push(m)
    }
    return byDate
  }

  const renderMatchRow = (match: (typeof matches)[number]) => {
    const lineupStatuses = ['OPEN_FOR_SUBMISSION', 'TIEBREAK_REQUIRED']
    const isMyMatch = captainTeamIds.has(match.homeTeam.id) || captainTeamIds.has(match.awayTeam.id)
    const captainTeamId = lineupStatuses.includes(match.status) && isMyMatch
      ? (captainTeamIds.has(match.homeTeam.id) ? match.homeTeam.id : match.awayTeam.id)
      : null
    const displayStatus = lineupStatuses.includes(match.status) && !isMyMatch ? 'UPCOMING' : match.status
    const isCompleted = match.status === 'COMPLETED'

    return (
      <Link
        key={match.id}
        href={match.slug ? `/matches/${match.slug}` : '#'}
        className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 gap-3 hover:border-brand-500/50 transition-colors group"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary group-hover:text-brand-300 transition-colors">
            {match.homeTeam.name}
            {isCompleted && match.homeTeamScore !== null && match.awayTeamScore !== null && (
              <span className={['mx-1.5 font-black tabular-nums', match.winnerId === match.homeTeam.id ? 'text-brand-400' : 'text-text-muted'].join(' ')}>
                {match.homeTeamScore}
              </span>
            )}
            {isCompleted ? '—' : ' vs '}
            {isCompleted && match.homeTeamScore !== null && match.awayTeamScore !== null && (
              <span className={['mx-1.5 font-black tabular-nums', match.winnerId === match.awayTeam.id ? 'text-brand-400' : 'text-text-muted'].join(' ')}>
                {match.awayTeamScore}
              </span>
            )}
            {match.awayTeam.name}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {match.scheduledAt ? formatTime(match.scheduledAt) : 'Time TBD'}
            {match.court && ` · ${match.court}`}
            {match.group && ` · ${match.group.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={STATUS_VARIANT[displayStatus] ?? 'default'}>
            {displayStatus.replace(/_/g, ' ')}
          </Badge>
          {captainTeamId && (
            <span
              onClick={(e) => e.preventDefault()}
              className="contents"
            >
              <Link
                href={`/lineup/${match.id}?teamId=${captainTeamId}`}
                className="text-xs font-bold text-brand-400 hover:text-brand-300 border border-brand-500/40 rounded px-2 py-1 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Submit Lineup
              </Link>
            </span>
          )}
          <span className="text-text-muted group-hover:text-brand-400 transition-colors text-base">›</span>
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-8">
      {/* Upcoming / in-progress */}
      {upcomingMatches.length > 0 && (
        <div className="space-y-4">
          {Object.entries(groupByDate(upcomingMatches)).map(([date, dayMatches]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{date}</p>
              <div className="space-y-2">{dayMatches.map(renderMatchRow)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Completed results */}
      {completedMatches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-green-500" />
            <p className="text-green-500 text-xs font-bold tracking-[0.15em] uppercase font-display">
              Results
            </p>
          </div>
          {Object.entries(groupByDate(completedMatches)).map(([date, dayMatches]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{date}</p>
              <div className="space-y-2">{dayMatches.map(renderMatchRow)}</div>
            </div>
          ))}
        </div>
      )}

      {matches.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-text-muted text-sm">Schedule not published yet.</p>
        </div>
      )}
    </div>
  )
}
