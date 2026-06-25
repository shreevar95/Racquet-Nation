import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PushNotificationButton } from '@/components/PushNotificationButton'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { DashboardTabs, type DashboardMatch, type DashboardTeam } from '@/components/dashboard/DashboardTabs'
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

  // Teams this user captains
  const playerProfile = await prisma.playerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })

  const captainedTeams = playerProfile
    ? await prisma.teamMembership.findMany({
        where: { playerId: playerProfile.id, role: 'CAPTAIN' },
        select: {
          team: {
            select: {
              id: true,
              name: true,
              primaryColor: true,
              logoUrl: true,
              tournament: { select: { name: true, slug: true, status: true } },
            },
          },
        },
      })
    : []
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

  const dashboardMatches: DashboardMatch[] = restMatches.map((m, i) => {
    const needsLineup = matchNeedsLineup(m.status)
    return {
      id: m.id,
      slug: m.slug,
      homeTeamName: m.homeTeam.name,
      awayTeamName: m.awayTeam.name,
      tournamentName: m.tournament.name,
      statusLabel: needsLineup ? 'Submit lineup →' : m.status === 'IN_PROGRESS' ? 'Live' : m.status.replace(/_/g, ' '),
      needsLineup,
      accent: ROW_ACCENTS[i % ROW_ACCENTS.length],
    }
  })

  const dashboardTeams: DashboardTeam[] = captainedTeams.map(({ team }) => ({
    id: team.id,
    name: team.name,
    primaryColor: team.primaryColor,
    logoUrl: team.logoUrl,
    sub: team.tournament.name,
    manageHref: `/manage/${team.tournament.slug}/teams`,
  }))

  return (
    <div className="bg-paper font-nunito text-ink">
      <div className="mx-auto max-w-2xl px-4 pb-10">
        <div className="pt-4">
          <div className="text-[11px] font-extrabold tracking-[.14em] text-saffron">WELCOME BACK</div>
          <div className="font-nunito text-2xl font-black leading-none text-ink">{firstName}</div>
        </div>

        {nextMatch && (
          <RnCard className="mt-4 p-4 shadow-[0_12px_28px_rgba(43,52,58,.12)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-[.16em] text-saffron">YOUR NEXT MATCH</span>
              <span className="text-[10px] font-extrabold text-rn-green">
                {nextMatch.scheduledAt
                  ? new Date(nextMatch.scheduledAt).toLocaleString('en-IN', {
                      weekday: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : 'TBD'}
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

        <div className="flex justify-end pt-4">
          <PushNotificationButton />
        </div>

        <div className="mt-1">
          <DashboardTabs matches={dashboardMatches} teams={dashboardTeams} />
        </div>

        {!nextMatch && upcomingMatches.length === 0 && (
          <RnCard className="mt-5 p-10 text-center">
            <p className="font-nunito text-lg font-extrabold uppercase text-rn-text-muted">No upcoming matches</p>
            <p className="mt-2 text-sm text-rn-text-muted">Register for a tournament to get started.</p>
            <Link href="/tournaments" className="mt-4 inline-block text-sm font-extrabold text-saffron">
              Browse Tournaments →
            </Link>
          </RnCard>
        )}

        {isAdmin && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <span className="h-0.5 w-4 bg-saffron" />
              <p className="text-sm font-black uppercase tracking-[.15em] text-saffron">My Tournaments</p>
            </div>

            <Link href="/admin/tournaments/new" className={cn(rnButtonVariants({ variant: 'primary', size: 'lg' }), 'w-full')}>
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Create Tournament
            </Link>

            {managedTournaments.length > 0 && (
              <RnCard className="overflow-hidden">
                <div className="border-b border-rn-border bg-saffron-tint px-4 py-3">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-secondary">
                    Your Tournaments
                  </p>
                </div>
                <div className="divide-y divide-rn-border">
                  {managedTournaments.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/manage/${t.slug}`}
                      className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-saffron-tint"
                    >
                      <span className="truncate text-sm font-bold text-ink">{t.name}</span>
                      <span
                        className={cn(
                          'ml-3 shrink-0 text-xs font-extrabold uppercase',
                          t.status === 'ACTIVE'
                            ? 'text-saffron'
                            : t.status === 'REGISTRATION_OPEN' || t.status === 'COMPLETED'
                              ? 'text-rn-green'
                              : 'text-rn-text-muted',
                        )}
                      >
                        {STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </Link>
                  ))}
                </div>
              </RnCard>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
