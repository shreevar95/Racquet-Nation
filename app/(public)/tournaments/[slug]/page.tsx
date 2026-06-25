import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { formatDate, formatTime } from '@/lib/utils'
import { RnCard } from '@/components/rn/RnCard'
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

const STATUS_STYLE: Record<string, string> = {
  UPCOMING: 'bg-rn-text-muted/10 text-rn-text-muted',
  OPEN_FOR_SUBMISSION: 'bg-rn-blue/10 text-rn-blue',
  LOCKED: 'bg-saffron-tint text-saffron',
  IN_PROGRESS: 'bg-saffron-tint text-saffron',
  TIEBREAK_REQUIRED: 'bg-rn-yellow/20 text-ink',
}

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

  return (
    <div className="space-y-5">

      {/* Compact registration status bar */}
      {tournament.status === 'REGISTRATION_OPEN' && (
        <RnCard className="flex items-center justify-between gap-3 p-4 text-sm">
          {isActiveReg ? (
            <>
              <span className="text-rn-text-secondary">
                Your registration:{' '}
                <span className={
                  myRegistration!.status === 'APPROVED' ? 'font-extrabold text-rn-green' :
                  myRegistration!.status === 'WAITLISTED' ? 'font-extrabold text-saffron' :
                  'font-extrabold text-ink'
                }>
                  {myRegistration!.status === 'APPROVED' ? 'Confirmed' :
                   myRegistration!.status === 'WAITLISTED' ? 'Waitlisted' : 'Under review'}
                </span>
              </span>
              <WithdrawButton tournamentId={tournament.id} />
            </>
          ) : (
            <>
              <span className="text-rn-text-secondary">
                {isFull
                  ? `Tournament full · ${approvedCount}/${tournament.maxPlayers} spots`
                  : `Registration open · ${approvedCount}/${tournament.maxPlayers} spots filled`}
              </span>
              <Link
                href={`/register/${slug}`}
                className="shrink-0 font-extrabold text-saffron transition-colors hover:text-saffron-300"
              >
                {isFull ? 'Join Waitlist →' : 'Register →'}
              </Link>
            </>
          )}
        </RnCard>
      )}

      {/* Schedule — main content */}
      {tournament.matches.length === 0 ? (
        <RnCard className="border-dashed p-8 text-center">
          <p className="text-sm text-rn-text-muted">Schedule not published yet.</p>
        </RnCard>
      ) : (
        <div className="space-y-5">
          {Object.entries(byDate).map(([date, dayMatches]) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">{date}</p>
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
                    <RnCard key={match.id} className="flex items-center justify-between gap-3 p-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink">
                          {match.homeTeam.name} vs {match.awayTeam.name}
                        </p>
                        <p className="mt-0.5 text-xs text-rn-text-muted">
                          {match.scheduledAt ? `${formatTime(match.scheduledAt)}` : 'Time TBD'}
                          {match.court && ` · ${match.court}`}
                          {match.group && ` · ${match.group.name}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${STATUS_STYLE[displayStatus] ?? 'bg-rn-text-muted/10 text-rn-text-muted'}`}
                        >
                          {displayStatus.replace(/_/g, ' ')}
                        </span>
                        {captainTeamId && (
                          <Link
                            href={`/lineup/${match.id}?teamId=${captainTeamId}`}
                            className="rounded-lg border border-saffron/40 px-2 py-1 text-xs font-extrabold text-saffron transition-colors hover:bg-saffron-tint"
                          >
                            Submit Lineup
                          </Link>
                        )}
                      </div>
                    </RnCard>
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
              <span className="h-0.5 w-4 bg-saffron" />
              <p className="text-xs font-extrabold uppercase tracking-[.15em] text-saffron">Standings</p>
            </div>
            <Link href={`/tournaments/${slug}/standings`} className="text-xs text-rn-text-muted transition-colors hover:text-saffron">
              Full standings →
            </Link>
          </div>
          {tournament.groups.map((group) =>
            group.standings.length > 0 ? (
              <RnCard key={group.id} className="overflow-hidden">
                <div className="border-b border-rn-border bg-saffron-tint px-4 py-2.5">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-secondary">
                    {group.name}
                  </p>
                </div>
                <div className="divide-y divide-rn-border">
                  {group.standings.map((row) => (
                    <div key={row.teamId} className="flex items-center gap-3 px-4 py-3">
                      <span className={[
                        'w-5 shrink-0 font-nunito text-sm font-black',
                        row.position === 1 ? 'text-saffron' : 'text-rn-text-muted',
                      ].join(' ')}>
                        {row.position}
                      </span>
                      <Link
                        href={`/teams/${row.team.slug}`}
                        className="flex-1 truncate text-sm font-bold text-ink transition-colors hover:text-saffron"
                      >
                        {row.team.name}
                      </Link>
                      <div className="flex shrink-0 gap-4 text-xs text-rn-text-muted">
                        <span>{row.matchesWon}W · {row.matchesLost}L</span>
                        <span className="font-nunito font-black text-ink">{row.points}pts</span>
                      </div>
                    </div>
                  ))}
                </div>
              </RnCard>
            ) : null,
          )}
        </div>
      )}

      {/* Description */}
      {tournament.description && (
        <RnCard className="p-5">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[.15em] text-saffron">About</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-rn-text-secondary">
            {tournament.description}
          </p>
        </RnCard>
      )}
    </div>
  )
}
