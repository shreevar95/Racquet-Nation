import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { formatTime } from '@/lib/utils'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = { title: 'Standings' }
export const revalidate = 30

export default async function StandingsPage({ params }: Props) {
  const { slug } = await params
  const { userId: clerkId } = await auth()

  const tournament = await prisma.tournament.findUnique({
    where: { slug, isPublic: true },
    include: {
      groups: {
        include: {
          standings: {
            include: { team: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true } } },
            orderBy: { position: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  })
  if (!tournament) notFound()

  // Find the captain teams for "my team" highlighting, same pattern as the overview page.
  const captainTeamIds = new Set<string>()
  if (clerkId) {
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
      select: { playerProfile: { select: { id: true } } },
    })
    if (dbUser?.playerProfile) {
      const captainships = await prisma.teamMembership.findMany({
        where: { playerId: dbUser.playerProfile.id, role: 'CAPTAIN', team: { tournamentId: tournament.id } },
        select: { teamId: true },
      })
      captainships.forEach((c) => captainTeamIds.add(c.teamId))
    }
  }

  if (tournament.groups.every((g) => g.standings.length === 0)) {
    return (
      <RnCard className="border-dashed p-8 text-center">
        <p className="text-sm text-rn-text-muted">Standings will appear once matches have been played.</p>
      </RnCard>
    )
  }

  const allStandingsRows = tournament.groups.flatMap((g) => g.standings)
  const latestUpdate = allStandingsRows.length > 0
    ? new Date(Math.max(...allStandingsRows.map((r) => new Date(r.lastUpdated).getTime())))
    : null

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-extrabold uppercase tracking-[.15em] text-saffron">Standings</p>
        {latestUpdate && (
          <span className="text-xs text-rn-text-muted">Updated {formatTime(latestUpdate)}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {tournament.groups.map((group) =>
          group.standings.length > 0 ? (
            <RnCard key={group.id} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-rn-border px-4 py-2.5">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-rn-text-muted">
                  # · Team · {group.name}
                </p>
                <div className="flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-wider text-rn-text-muted">
                  <span className="hidden w-8 text-center sm:block">W</span>
                  <span className="hidden w-8 text-center sm:block">L</span>
                  <span className="w-12 text-center">MW</span>
                  <span className="w-8 text-right">Pts</span>
                </div>
              </div>
              <div className="divide-y divide-rn-border">
                {group.standings.map((row) => (
                  <div
                    key={row.teamId}
                    className={`flex items-center gap-3 px-4 py-3.5 ${captainTeamIds.has(row.teamId) ? 'bg-[#FFF1E7]' : ''}`}
                  >
                    <span className="w-5 shrink-0 text-center font-nunito text-sm font-black text-saffron">
                      {row.position}
                    </span>
                    <RnTeamTile name={row.team.name} logoUrl={row.team.logoUrl} color={row.team.primaryColor} size="sm" />
                    <Link
                      href={`/teams/${row.team.slug}`}
                      className="flex-1 truncate text-sm font-extrabold text-ink transition-colors hover:text-saffron"
                    >
                      {row.team.name}
                    </Link>
                    <div className="flex shrink-0 items-center gap-3 text-sm">
                      <span className="hidden w-8 text-center font-extrabold text-rn-green sm:block">{row.matchesWon}</span>
                      <span className="hidden w-8 text-center font-extrabold text-red-down sm:block">{row.matchesLost}</span>
                      <span className="w-12 text-center font-nunito text-ink">{row.gamesWon}</span>
                      <span className="w-8 text-right font-nunito font-black text-ink">{row.points}</span>
                    </div>
                  </div>
                ))}
              </div>
            </RnCard>
          ) : null,
        )}
      </div>
    </div>
  )
}
