import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime } from '@/lib/utils'
import { WithdrawButton } from './WithdrawButton'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const t = await prisma.tournament.findUnique({
    where: { slug },
    select: { name: true, description: true },
  })
  return {
    title: t?.name,
    description: t?.description ?? undefined,
    openGraph: { title: t?.name, description: t?.description ?? undefined },
  }
}

export const revalidate = 60

export default async function TournamentOverviewPage({ params }: Props) {
  const { slug } = await params
  const { userId: clerkId } = await auth()

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: {
      _count: { select: { teams: true, registrations: true } },
      matches: {
        where: { status: { not: 'COMPLETED' } },
        orderBy: [{ scheduledAt: 'asc' }, { matchNumber: 'asc' }],
        include: {
          homeTeam: { select: { id: true, name: true, slug: true } },
          awayTeam: { select: { id: true, name: true, slug: true } },
          group: { select: { name: true } },
        },
      },
      groups: {
        include: {
          standings: {
            include: { team: { select: { name: true, slug: true } } },
            orderBy: { position: 'asc' },
            take: 4,
          },
        },
        orderBy: { order: 'asc' },
        take: 2,
      },
    },
  })
  if (!tournament) notFound()

  const approvedCount = await prisma.registration.count({
    where: { tournamentId: tournament.id, status: 'APPROVED' },
  })
  const isFull = approvedCount >= tournament.maxPlayers

  // Check if the current user is already registered + find captain teams
  let myRegistration: { id: string; status: string; tournamentId: string } | null = null
  const captainTeamIds = new Set<string>()
  if (clerkId) {
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
      select: { playerProfile: { select: { id: true } } },
    })
    if (dbUser?.playerProfile) {
      const [reg, captainships] = await Promise.all([
        prisma.registration.findUnique({
          where: { tournamentId_playerId: { tournamentId: tournament.id, playerId: dbUser.playerProfile.id } },
          select: { id: true, status: true, tournamentId: true },
        }),
        prisma.teamMembership.findMany({
          where: { playerId: dbUser.playerProfile.id, role: 'CAPTAIN', team: { tournamentId: tournament.id } },
          select: { teamId: true },
        }),
      ])
      myRegistration = reg
      captainships.forEach((c) => captainTeamIds.add(c.teamId))
    }
  }

  const isActiveReg = myRegistration && myRegistration.status !== 'WITHDRAWN' && myRegistration.status !== 'REJECTED'

  // Group matches by date
  const byDate: Record<string, typeof tournament.matches> = {}
  for (const m of tournament.matches) {
    const key = m.scheduledAt ? formatDate(m.scheduledAt) : 'TBD'
    ;(byDate[key] ??= []).push(m)
  }

  const lineupStatuses = ['OPEN_FOR_SUBMISSION', 'TIEBREAK_REQUIRED']
  const STATUS_VARIANT: Record<string, 'default' | 'brand' | 'warning' | 'info'> = {
    UPCOMING: 'default',
    OPEN_FOR_SUBMISSION: 'info',
    LOCKED: 'brand',
    IN_PROGRESS: 'brand',
    TIEBREAK_REQUIRED: 'warning',
  }

  return (
    <div className="space-y-5">

      {/* Compact registration status bar */}
      {tournament.status === 'REGISTRATION_OPEN' && (
        <div className="flex items-center justify-between gap-3 text-sm">
          {isActiveReg ? (
            <>
              <span className="text-text-secondary">
                Your registration:{' '}
                <span className={
                  myRegistration!.status === 'APPROVED' ? 'text-success font-semibold' :
                  myRegistration!.status === 'WAITLISTED' ? 'text-warning font-semibold' :
                  'text-text-primary font-semibold'
                }>
                  {myRegistration!.status === 'APPROVED' ? 'Confirmed' :
                   myRegistration!.status === 'WAITLISTED' ? 'Waitlisted' : 'Under review'}
                </span>
              </span>
              <WithdrawButton tournamentId={tournament.id} />
            </>
          ) : (
            <>
              <span className="text-text-secondary">
                {isFull
                  ? `Tournament full · ${approvedCount}/${tournament.maxPlayers} spots`
                  : `Registration open · ${approvedCount}/${tournament.maxPlayers} spots filled`}
              </span>
              <Link
                href={`/register/${slug}`}
                className="text-brand-400 hover:text-brand-300 font-semibold transition-colors shrink-0"
              >
                {isFull ? 'Join Waitlist →' : 'Register →'}
              </Link>
            </>
          )}
        </div>
      )}

      {/* Schedule — main content */}
      {tournament.matches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-text-muted text-sm">Schedule not published yet.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(byDate).map(([date, dayMatches]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{date}</p>
              <div className="space-y-2">
                {dayMatches.map((match) => {
                  const isMyMatch =
                    captainTeamIds.has(match.homeTeam.id) || captainTeamIds.has(match.awayTeam.id)
                  const captainTeamId = lineupStatuses.includes(match.status) && isMyMatch
                    ? (captainTeamIds.has(match.homeTeam.id) ? match.homeTeam.id : match.awayTeam.id)
                    : null
                  const displayStatus =
                    lineupStatuses.includes(match.status) && !isMyMatch ? 'UPCOMING' : match.status
                  return (
                    <div key={match.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">
                          {match.homeTeam.name} vs {match.awayTeam.name}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {match.scheduledAt ? `${formatTime(match.scheduledAt)}` : 'Time TBD'}
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
      )}

      {/* Group standings preview */}
      {tournament.groups.some((g) => g.standings.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-4 bg-brand-500" />
              <p className="text-brand-500 text-xs font-bold tracking-[0.15em] uppercase font-display">
                Standings
              </p>
            </div>
            <Link href={`/tournaments/${slug}/standings`} className="text-xs text-text-muted hover:text-brand-400 transition-colors">
              Full standings →
            </Link>
          </div>
          {tournament.groups.map((group) =>
            group.standings.length > 0 ? (
              <div key={group.id} className="rounded-lg border border-border bg-surface-raised overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-surface-overlay">
                  <p className="text-xs font-display font-bold uppercase tracking-wider text-text-muted">
                    {group.name}
                  </p>
                </div>
                <div className="divide-y divide-border">
                  {group.standings.map((row) => (
                    <div key={row.teamId} className="flex items-center px-4 py-3 gap-3">
                      <span className={[
                        'text-sm font-black w-5 shrink-0 font-display',
                        row.position === 1 ? 'text-brand-500' : 'text-text-muted',
                      ].join(' ')}>
                        {row.position}
                      </span>
                      <Link
                        href={`/teams/${row.team.slug}`}
                        className="flex-1 text-sm font-semibold text-text-primary hover:text-brand-400 transition-colors truncate"
                      >
                        {row.team.name}
                      </Link>
                      <div className="flex gap-4 text-xs text-text-muted shrink-0">
                        <span>{row.matchesWon}W · {row.matchesLost}L</span>
                        <span className="font-black text-text-primary font-display">{row.points}pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}

      {/* Description */}
      {tournament.description && (
        <div className="rounded-lg bg-surface-raised border border-border p-5">
          <p className="text-xs font-display font-bold uppercase tracking-[0.15em] text-text-muted mb-3">About</p>
          <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
            {tournament.description}
          </p>
        </div>
      )}
    </div>
  )
}
