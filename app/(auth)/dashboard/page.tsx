import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PushNotificationButton } from '@/components/PushNotificationButton'
import { RnPageHeader } from '@/components/rn/RnPageHeader'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { RnStatTile } from '@/components/rn/RnStatTile'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Dashboard' }

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  REGISTRATION_OPEN: 'Open',
  REGISTRATION_CLOSED: 'Closed',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
}

const ROW_ACCENTS = ['#F4C24B', '#19A463', '#F26B21', '#3E9BD8']
const isPastStatus = (status: string) => status === 'COMPLETED' || status === 'ARCHIVED'
const tournamentStatusColor = (status: string) =>
  status === 'ACTIVE' ? 'text-saffron' : status === 'REGISTRATION_OPEN' || status === 'COMPLETED' ? 'text-rn-green' : 'text-rn-text-muted'

export default async function DashboardPage() {
  const user = await requireAuth()
  const isAdmin = user.platformRole === 'PLATFORM_ADMIN'

  const managedTournaments = isAdmin
    ? await prisma.tournament.findMany({
        where: { createdBy: user.id },
        select: { slug: true, name: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      })
    : []

  const playerProfile = await prisma.playerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })

  // All teams this user belongs to (any role) — drives "My Teams", and which
  // side of a match is "mine" for the upcoming-matches list and stat context.
  const allMemberships = playerProfile
    ? await prisma.teamMembership.findMany({
        where: { playerId: playerProfile.id },
        select: {
          role: true,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
              primaryColor: true,
              logoUrl: true,
              tournament: { select: { name: true, slug: true, status: true } },
            },
          },
        },
      })
    : []

  const myTeamIds = new Set(allMemberships.map((m) => m.team.id))

  const upcomingMatches = playerProfile
    ? await prisma.match.findMany({
        where: {
          status: { in: ['UPCOMING', 'OPEN_FOR_SUBMISSION', 'LOCKED', 'IN_PROGRESS', 'TIEBREAK_REQUIRED'] },
          OR: [
            { homeTeam: { memberships: { some: { playerId: playerProfile.id } } } },
            { awayTeam: { memberships: { some: { playerId: playerProfile.id } } } },
          ],
        },
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
          tournament: { select: { name: true, slug: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 6,
      })
    : []

  const firstName = user.name.split(' ')[0]

  const matchNeedsLineup = (status: string) => status === 'OPEN_FOR_SUBMISSION' || status === 'TIEBREAK_REQUIRED'

  const nextMatchIndex = upcomingMatches.findIndex((m) => matchNeedsLineup(m.status))
  const nextMatch = nextMatchIndex >= 0 ? upcomingMatches[nextMatchIndex] : upcomingMatches[0]
  const restMatches = upcomingMatches.filter((m) => m.id !== nextMatch?.id)

  // Anchor the stat tiles / group standings card to whichever team of the
  // next match belongs to the viewer, per explicit product decision.
  const myTeamId = nextMatch
    ? myTeamIds.has(nextMatch.homeTeam.id)
      ? nextMatch.homeTeam.id
      : myTeamIds.has(nextMatch.awayTeam.id)
        ? nextMatch.awayTeam.id
        : null
    : null

  const myStanding = myTeamId
    ? await prisma.standings.findFirst({
        where: { teamId: myTeamId },
        select: {
          matchesWon: true,
          matchesLost: true,
          position: true,
          groupId: true,
          group: { select: { name: true } },
        },
      })
    : null

  const groupStandings = myStanding
    ? await prisma.standings.findMany({
        where: { groupId: myStanding.groupId },
        orderBy: { position: 'asc' },
        take: 5,
        include: { team: { select: { id: true, name: true, slug: true, primaryColor: true, logoUrl: true } } },
      })
    : []

  const dashboardMatches = restMatches.map((m, i) => {
    const myTeam = myTeamIds.has(m.homeTeam.id) ? m.homeTeam : m.awayTeam
    const opponent = myTeam.id === m.homeTeam.id ? m.awayTeam : m.homeTeam
    const needsLineup = matchNeedsLineup(m.status)
    const meta = [
      m.scheduledAt
        ? new Date(m.scheduledAt).toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
        : 'Time TBD',
      m.court,
      m.tournament.name,
    ]
      .filter(Boolean)
      .join(' · ')
    return {
      id: m.id,
      slug: m.slug,
      opponentName: opponent.name,
      meta,
      statusLabel: needsLineup ? 'LINEUP →' : m.status === 'IN_PROGRESS' ? 'Live' : 'Upcoming',
      needsLineup,
      accent: ROW_ACCENTS[i % ROW_ACCENTS.length],
    }
  })

  const dashboardTeamsAll = allMemberships.map(({ team, role }) => ({
    id: team.id,
    name: team.name,
    primaryColor: team.primaryColor,
    logoUrl: team.logoUrl,
    sub: team.tournament.name,
    isCaptain: role === 'CAPTAIN',
    href: role === 'CAPTAIN' ? `/manage/${team.tournament.slug}/teams` : `/teams/${team.slug}`,
    isPast: isPastStatus(team.tournament.status),
  }))
  const currentTeams = dashboardTeamsAll.filter((t) => !t.isPast)
  const pastTeams = dashboardTeamsAll.filter((t) => t.isPast)

  const currentManagedTournaments = managedTournaments.filter((t) => !isPastStatus(t.status))
  const pastManagedTournaments = managedTournaments.filter((t) => isPastStatus(t.status))

  return (
    <div className="bg-paper font-nunito text-ink">
      <RnPageHeader eyebrow="WELCOME BACK" title={firstName} />

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.45fr_1fr]">
          {/* LEFT — next match + upcoming matches */}
          <div className="space-y-5">
            {nextMatch && (
              <RnCard className="p-4 shadow-[0_12px_28px_rgba(43,52,58,.12)]">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold tracking-[.16em] text-saffron">YOUR NEXT MATCH</span>
                  <span className="text-[10px] font-extrabold text-rn-green">
                    {[
                      nextMatch.scheduledAt
                        ? new Date(nextMatch.scheduledAt)
                            .toLocaleString('en-IN', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
                            .toUpperCase()
                        : 'TBD',
                      nextMatch.court?.toUpperCase(),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-center">
                    <RnTeamTile name={nextMatch.homeTeam.name} color="#F26B21" size="lg" className="mx-auto mb-1.5" />
                    <div className="text-[13px] font-extrabold text-ink">{nextMatch.homeTeam.name}</div>
                  </div>
                  <div className="text-[11px] font-extrabold tracking-[.14em] text-rn-text-muted">VS</div>
                  <div className="flex-1 text-center">
                    <RnTeamTile name={nextMatch.awayTeam.name} color="#19A463" size="lg" className="mx-auto mb-1.5" />
                    <div className="text-[13px] font-extrabold text-ink">{nextMatch.awayTeam.name}</div>
                  </div>
                </div>
                <div className="mt-2.5 text-center text-[11px] text-rn-text-muted">{nextMatch.tournament.name}</div>
                <Link
                  href={`/matches/${nextMatch.slug}`}
                  className={cn(rnButtonVariants({ variant: 'primary' }), 'mt-3.5 w-full')}
                >
                  {matchNeedsLineup(nextMatch.status) ? 'Submit your lineup →' : 'View match →'}
                </Link>
              </RnCard>
            )}

            <div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold uppercase tracking-[.14em] text-rn-text-muted">
                  Upcoming Matches
                </p>
                <PushNotificationButton />
              </div>

              <div className="mt-3 flex flex-col gap-2.5">
                {dashboardMatches.length === 0 ? (
                  <RnCard className="p-6 text-center text-sm text-rn-text-muted">No other matches scheduled.</RnCard>
                ) : (
                  dashboardMatches.map((m) => (
                    <Link key={m.id} href={`/matches/${m.slug}`}>
                      <RnCard className="flex items-center gap-3 p-3.5">
                        <span className="h-[38px] w-1.5 shrink-0 rounded" style={{ background: m.accent }} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-extrabold text-ink">vs {m.opponentName}</div>
                          <div className="truncate text-xs text-rn-text-muted">{m.meta}</div>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 text-[11px] font-extrabold',
                            m.needsLineup ? 'text-rn-green' : 'text-rn-text-muted',
                          )}
                        >
                          {m.statusLabel}
                        </span>
                      </RnCard>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {!nextMatch && upcomingMatches.length === 0 && (
              <RnCard className="p-10 text-center">
                <p className="font-nunito text-lg font-extrabold uppercase text-rn-text-muted">No upcoming matches</p>
                <p className="mt-2 text-sm text-rn-text-muted">Register for a tournament to get started.</p>
                <Link href="/tournaments" className="mt-4 inline-block text-sm font-extrabold text-saffron">
                  Browse Tournaments →
                </Link>
              </RnCard>
            )}
          </div>

          {/* RIGHT — stats, group standings, my teams */}
          <div className="space-y-5">
            {myStanding && (
              <div className="flex gap-3">
                <RnStatTile value={`${myStanding.matchesWon}–${myStanding.matchesLost}`} label="RECORD" />
                <RnStatTile value={`#${myStanding.position}`} label="RANK" highlighted />
              </div>
            )}

            {myStanding && groupStandings.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[.14em] text-saffron">
                  My Standings
                </p>
                <RnCard className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-rn-border px-4 py-2.5">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-rn-text-muted">
                      # · Team · {myStanding.group.name}
                    </p>
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-rn-text-muted">Pts</p>
                  </div>
                  <div className="divide-y divide-rn-border">
                    {groupStandings.map((row) => (
                      <div
                        key={row.teamId}
                        className={cn('flex items-center gap-3 px-4 py-3.5', row.teamId === myTeamId && 'bg-[#FFF1E7]')}
                      >
                        <span className="w-5 shrink-0 text-center font-nunito text-sm font-black text-saffron">
                          {row.position}
                        </span>
                        <RnTeamTile name={row.team.name} color={row.team.primaryColor} logoUrl={row.team.logoUrl} size="sm" />
                        <Link
                          href={`/teams/${row.team.slug}`}
                          className="flex-1 truncate text-sm font-extrabold text-ink transition-colors hover:text-saffron"
                        >
                          {row.team.name}
                        </Link>
                        <span className="shrink-0 font-nunito text-base font-black text-ink">{row.points}</span>
                      </div>
                    ))}
                  </div>
                </RnCard>
              </div>
            )}

            {dashboardTeamsAll.length > 0 && (
              <RnCard className="overflow-hidden">
                <p className="border-b border-rn-border px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-[.1em] text-ink">
                  My Teams
                </p>
                <div className="divide-y divide-rn-border">
                  {currentTeams.map((t) => (
                    <Link
                      key={t.id}
                      href={t.href}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-saffron-tint"
                    >
                      <RnTeamTile name={t.name} color={t.primaryColor} logoUrl={t.logoUrl} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-extrabold text-ink">{t.name}</div>
                        <div className="truncate text-xs text-rn-text-muted">{t.sub}</div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 text-[11px] font-extrabold',
                          t.isCaptain ? 'text-saffron' : 'text-rn-text-muted',
                        )}
                      >
                        {t.isCaptain ? 'Manage →' : 'View →'}
                      </span>
                    </Link>
                  ))}

                  {pastTeams.length > 0 && (
                    <>
                      <div className="bg-paper px-4 py-1.5">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-rn-text-muted">Past</p>
                      </div>
                      {pastTeams.map((t) => (
                        <Link
                          key={t.id}
                          href={t.href}
                          className="flex items-center gap-3 px-4 py-3 opacity-75 transition-colors hover:bg-saffron-tint hover:opacity-100"
                        >
                          <RnTeamTile name={t.name} color={t.primaryColor} logoUrl={t.logoUrl} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-extrabold text-ink">{t.name}</div>
                            <div className="truncate text-xs text-rn-text-muted">{t.sub}</div>
                          </div>
                          <span
                            className={cn(
                              'shrink-0 text-[11px] font-extrabold',
                              t.isCaptain ? 'text-saffron' : 'text-rn-text-muted',
                            )}
                          >
                            {t.isCaptain ? 'Manage →' : 'View →'}
                          </span>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              </RnCard>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="mt-8 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-4 bg-saffron" />
                <p className="text-sm font-black uppercase tracking-[.15em] text-saffron">Your Tournaments</p>
              </div>
              <Link
                href="/admin/tournaments/new"
                className="flex shrink-0 items-center gap-1.5 text-sm font-extrabold text-saffron transition-colors hover:text-saffron-300"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
                Create Tournament
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {currentManagedTournaments.map((t) => (
                <Link key={t.slug} href={`/manage/${t.slug}`}>
                  <RnCard className="rn-card-hover h-full p-5">
                    <p className="truncate text-sm font-bold text-ink">{t.name}</p>
                    <span className={cn('mt-1.5 block text-xs font-extrabold uppercase', tournamentStatusColor(t.status))}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                  </RnCard>
                </Link>
              ))}
            </div>

            {pastManagedTournaments.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">Past</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pastManagedTournaments.map((t) => (
                    <Link key={t.slug} href={`/manage/${t.slug}`}>
                      <RnCard className="rn-card-hover h-full p-5 opacity-75 transition-opacity hover:opacity-100">
                        <p className="truncate text-sm font-bold text-ink">{t.name}</p>
                        <span className={cn('mt-1.5 block text-xs font-extrabold uppercase', tournamentStatusColor(t.status))}>
                          {STATUS_LABEL[t.status] ?? t.status}
                        </span>
                      </RnCard>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
