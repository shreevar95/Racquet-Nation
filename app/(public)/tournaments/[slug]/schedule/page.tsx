import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { formatDate, formatTime } from '@/lib/utils'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = { title: 'Schedule' }

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: 'bg-rn-blue/10 text-rn-blue',
  OPEN_FOR_SUBMISSION: 'bg-rn-blue/10 text-rn-blue',
  LOCKED: 'bg-saffron-tint text-saffron',
  IN_PROGRESS: 'bg-saffron-tint text-saffron',
  TIEBREAK_REQUIRED: 'bg-rn-yellow/20 text-ink',
  COMPLETED: 'bg-rn-green/10 text-rn-green',
}

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
      homeTeam: { select: { id: true, name: true, slug: true, primaryColor: true, logoUrl: true } },
      awayTeam: { select: { id: true, name: true, slug: true, primaryColor: true, logoUrl: true } },
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
      <RnCard className="border-dashed p-8 text-center">
        <p className="text-sm text-rn-text-muted">Schedule not published yet.</p>
      </RnCard>
    )
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
      <Link key={match.id} href={match.slug ? `/matches/${match.slug}` : '#'}>
        <RnCard className="rn-card-hover flex items-center gap-3 p-3.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <RnTeamTile name={match.homeTeam.name} color={match.homeTeam.primaryColor} logoUrl={match.homeTeam.logoUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">
                {match.homeTeam.name}
                {isCompleted && match.homeTeamScore !== null && match.awayTeamScore !== null && (
                  <span className={cn('mx-1.5 font-nunito font-black tabular-nums', match.winnerId === match.homeTeam.id ? 'text-rn-green' : 'text-rn-text-muted')}>
                    {match.homeTeamScore}
                  </span>
                )}
                {isCompleted ? '—' : ' vs '}
                {isCompleted && match.homeTeamScore !== null && match.awayTeamScore !== null && (
                  <span className={cn('mx-1.5 font-nunito font-black tabular-nums', match.winnerId === match.awayTeam.id ? 'text-rn-green' : 'text-rn-text-muted')}>
                    {match.awayTeamScore}
                  </span>
                )}
                {match.awayTeam.name}
              </p>
              <p className="mt-0.5 text-xs text-rn-text-muted">
                {match.scheduledAt ? formatTime(match.scheduledAt) : 'Time TBD'}
                {match.court && ` · ${match.court}`}
                {match.group && ` · ${match.group.name}`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide', STATUS_STYLE[displayStatus] ?? 'bg-rn-text-muted/10 text-rn-text-muted')}>
              {displayStatus.replace(/_/g, ' ')}
            </span>
            {captainTeamId && (
              <Link
                href={`/lineup/${match.id}?teamId=${captainTeamId}`}
                className="rounded-lg border border-saffron/40 px-2 py-1 text-xs font-extrabold text-saffron transition-colors hover:bg-saffron-tint"
                onClick={(e) => e.stopPropagation()}
              >
                Submit Lineup
              </Link>
            )}
          </div>
        </RnCard>
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
              <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">{date}</p>
              <div className="space-y-2">{dayMatches.map(renderMatchRow)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Completed results */}
      {completedMatches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-rn-green" />
            <p className="text-xs font-extrabold uppercase tracking-[.15em] text-rn-green">
              Results
            </p>
          </div>
          {Object.entries(groupByDate(completedMatches)).map(([date, dayMatches]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">{date}</p>
              <div className="space-y-2">{dayMatches.map(renderMatchRow)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
