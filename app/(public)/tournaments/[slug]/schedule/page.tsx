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
    where: { tournamentId: tournament.id, status: { not: 'COMPLETED' } },
    include: {
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

  const STATUS_VARIANT: Record<string, 'default' | 'brand' | 'warning' | 'info'> = {
    UPCOMING: 'default',
    OPEN_FOR_SUBMISSION: 'info',
    LOCKED: 'brand',
    IN_PROGRESS: 'brand',
    TIEBREAK_REQUIRED: 'warning',
  }

  return (
    <div className="space-y-6">
      {Object.entries(byDate).map(([date, dayMatches]) => (
        <div key={date} className="space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{date}</p>
          <div className="space-y-2">
            {dayMatches.map((match) => {
              const lineupStatuses = ['OPEN_FOR_SUBMISSION', 'TIEBREAK_REQUIRED']
              const isMyMatch =
                captainTeamIds.has(match.homeTeam.id) || captainTeamIds.has(match.awayTeam.id)
              const captainTeamId = lineupStatuses.includes(match.status) && isMyMatch
                ? (captainTeamIds.has(match.homeTeam.id) ? match.homeTeam.id : match.awayTeam.id)
                : null
              // Non-captain viewers see OPEN_FOR_SUBMISSION/TIEBREAK as UPCOMING
              const displayStatus =
                lineupStatuses.includes(match.status) && !isMyMatch ? 'UPCOMING' : match.status
              return (
                <div key={match.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {match.homeTeam.name} vs {match.awayTeam.name}
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
                      <Link
                        href={`/lineup/${match.id}?teamId=${captainTeamId}`}
                        className="text-xs font-bold text-brand-400 hover:text-brand-300 border border-brand-500/40 rounded px-2 py-1 transition-colors"
                      >
                        Submit Lineup
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
