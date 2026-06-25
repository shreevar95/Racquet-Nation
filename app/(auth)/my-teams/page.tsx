import type { Metadata } from 'next'
import Link from 'next/link'
import { Feather, CircleDot } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { RnPageHeader } from '@/components/rn/RnPageHeader'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Teams' }

// lucide-react has no racquet-sport-specific icons; Feather reads as a
// shuttlecock for badminton, everything else falls back to a ball glyph.
const SPORT_ICON: Record<string, typeof CircleDot> = {
  badminton: Feather,
}

const SPORT_ACCENT: Record<string, string> = {
  pickleball: '#F26B21',
  tennis: '#19A463',
  badminton: '#3E9BD8',
  padel: '#F4C24B',
  squash: '#B07CC0',
  'table-tennis': '#E0533B',
}

export default async function MyTeamsPage() {
  const user = await requireAuth()

  const playerProfile = await prisma.playerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })

  const memberships = playerProfile
    ? await prisma.teamMembership.findMany({
        where: { playerId: playerProfile.id },
        include: {
          team: {
            include: {
              tournament: {
                select: {
                  name: true,
                  slug: true,
                  status: true,
                  primaryColor: true,
                  sport: { select: { name: true, slug: true } },
                },
              },
              group: { select: { name: true } },
              memberships: { select: { id: true } },
              homeMatches: {
                where: { status: { in: ['OPEN_FOR_SUBMISSION', 'TIEBREAK_REQUIRED'] } },
                select: {
                  id: true,
                  status: true,
                  awayTeam: { select: { name: true, primaryColor: true, logoUrl: true } },
                },
              },
              awayMatches: {
                where: { status: { in: ['OPEN_FOR_SUBMISSION', 'TIEBREAK_REQUIRED'] } },
                select: {
                  id: true,
                  status: true,
                  homeTeam: { select: { name: true, primaryColor: true, logoUrl: true } },
                },
              },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      })
    : []

  const captainTeamIds = new Set(
    memberships.filter((m) => m.role === 'CAPTAIN').map((m) => m.teamId),
  )

  return (
    <div className="min-h-screen bg-paper font-nunito text-ink">
      <RnPageHeader eyebrow="PLAYER" title="My Teams" />

      <div className="mx-auto max-w-[860px] px-4 pb-6 pt-4">
        <p className="mb-4 text-sm text-rn-text-secondary">All teams you are part of across tournaments.</p>

        {memberships.length === 0 ? (
          <RnCard className="border-dashed p-12 text-center">
            <p className="font-nunito text-lg font-extrabold uppercase text-rn-text-muted">No teams yet</p>
            <p className="mt-2 text-sm text-rn-text-muted">Register for a tournament to get assigned to a team.</p>
            <Link href="/tournaments" className="mt-4 inline-block text-sm font-extrabold text-saffron">
              Browse Tournaments →
            </Link>
          </RnCard>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {memberships.map(({ team, role }) => {
              const isCaptain = captainTeamIds.has(team.id)
              const openMatches = [
                ...team.homeMatches.map((m) => ({ ...m, opponent: m.awayTeam })),
                ...team.awayMatches.map((m) => ({ ...m, opponent: m.homeTeam })),
              ]
              const hasOpenLineups = isCaptain && openMatches.length > 0
              const roleLabel = role.charAt(0) + role.slice(1).toLowerCase()
              const sportSlug = team.tournament.sport.slug
              const SportIcon = SPORT_ICON[sportSlug] ?? CircleDot
              const accent = team.tournament.primaryColor ?? SPORT_ACCENT[sportSlug] ?? '#8493a6'

              return (
                <RnCard
                  key={team.id}
                  className={cn('relative overflow-hidden pl-6 pr-5 py-5', hasOpenLineups && 'md:col-span-2')}
                >
                  <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: accent }} />

                  <div className="flex items-center gap-3">
                    <RnTeamTile name={team.name} color={team.primaryColor} logoUrl={team.logoUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-extrabold text-ink">{team.name}</span>
                        {isCaptain && (
                          <span className="rounded bg-saffron-tint px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-saffron">
                            Captain
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-rn-text-muted">
                        <SportIcon size={12} className="shrink-0" />
                        <span className="truncate">{team.tournament.name}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {team.group && (
                          <span className="rounded-full border border-rn-border bg-paper px-2 py-0.5 text-[10px] font-bold text-rn-text-secondary">
                            {team.group.name}
                          </span>
                        )}
                        <span className="rounded-full border border-rn-border bg-paper px-2 py-0.5 text-[10px] font-bold text-rn-text-secondary">
                          {team.memberships.length} player{team.memberships.length !== 1 ? 's' : ''}
                        </span>
                        <span className="text-[10px] font-bold text-rn-text-muted">{roleLabel}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Link
                        href={`/teams/${team.slug}`}
                        className="text-xs font-bold text-rn-text-muted transition-colors hover:text-saffron"
                      >
                        View →
                      </Link>
                      {isCaptain && (
                        <Link
                          href={`/manage/${team.tournament.slug}/teams`}
                          className="text-xs font-extrabold text-saffron"
                        >
                          Manage →
                        </Link>
                      )}
                    </div>
                  </div>

                  {hasOpenLineups && (
                    <div className="mt-5 border-t border-rn-border pt-4">
                      <p className="mb-2.5 text-xs font-extrabold uppercase tracking-wide text-saffron">
                        Lineup submission open
                      </p>
                      <div className="space-y-1">
                        {openMatches.map((m) => (
                          <div key={m.id} className="flex items-center justify-between gap-2 py-1.5">
                            <div className="flex items-center gap-2">
                              <RnTeamTile
                                name={m.opponent.name}
                                color={m.opponent.primaryColor}
                                logoUrl={m.opponent.logoUrl}
                                size="sm"
                              />
                              <p className="text-xs text-rn-text-secondary">vs {m.opponent.name}</p>
                            </div>
                            <Link
                              href={`/lineup/${m.id}?teamId=${team.id}`}
                              className="shrink-0 text-xs font-extrabold text-saffron"
                            >
                              Submit Lineup →
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </RnCard>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
