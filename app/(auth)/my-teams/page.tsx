import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TeamAvatar } from '@/components/ui/team-avatar'

export const metadata: Metadata = { title: 'My Teams' }

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
              tournament: { select: { name: true, slug: true, status: true } },
              group: { select: { name: true } },
              memberships: { select: { id: true } },
              homeMatches: {
                where: { status: { in: ['OPEN_FOR_SUBMISSION', 'TIEBREAK_REQUIRED'] } },
                select: { id: true, status: true, awayTeam: { select: { name: true } } },
              },
              awayMatches: {
                where: { status: { in: ['OPEN_FOR_SUBMISSION', 'TIEBREAK_REQUIRED'] } },
                select: { id: true, status: true, homeTeam: { select: { name: true } } },
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
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">

      <div className="border-b border-border pb-5">
        <p className="text-brand-500 text-xs font-bold tracking-[0.2em] uppercase font-display mb-1">
          Player
        </p>
        <h1 className="font-display font-black text-5xl uppercase text-text-primary leading-tight">
          My Teams
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          All teams you are part of across tournaments.
        </p>
      </div>

      {memberships.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="font-display font-bold text-lg uppercase text-text-muted">No teams yet</p>
          <p className="text-text-muted text-sm mt-2">Register for a tournament to get assigned to a team.</p>
          <Link
            href="/tournaments"
            className="inline-block mt-4 text-brand-500 text-sm font-semibold hover:text-brand-400 transition-colors"
          >
            Browse Tournaments →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {memberships.map(({ team, role }) => {
            const isCaptain = captainTeamIds.has(team.id)
            const openMatches = [
              ...team.homeMatches.map((m) => ({ ...m, opponent: m.awayTeam.name })),
              ...team.awayMatches.map((m) => ({ ...m, opponent: m.homeTeam.name })),
            ]
            return (
              <div key={team.id} className="rounded-lg border border-border bg-surface-raised p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <TeamAvatar
                      name={team.name}
                      logoUrl={team.logoUrl}
                      primaryColor={team.primaryColor}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-text-primary">{team.name}</p>
                        {isCaptain && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-400">
                            Captain
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {team.tournament.name}
                        {team.group && ` · ${team.group.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/teams/${team.slug}`}
                      className="text-xs text-text-muted hover:text-brand-400 transition-colors"
                    >
                      View →
                    </Link>
                    {isCaptain && (
                      <Link
                        href={`/manage/${team.tournament.slug}/teams`}
                        className="text-xs font-semibold text-brand-400 hover:text-brand-300 border border-brand-500/40 rounded px-2 py-0.5 transition-colors"
                      >
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
                <p className="text-xs text-text-muted">
                  {team.memberships.length} player{team.memberships.length !== 1 ? 's' : ''} · {role.charAt(0) + role.slice(1).toLowerCase()}
                </p>
                {isCaptain && openMatches.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-semibold text-warning uppercase tracking-wide">Lineup submission open</p>
                    {openMatches.map((m) => (
                      <div key={m.id} className="flex items-center justify-between gap-2">
                        <p className="text-xs text-text-secondary">vs {m.opponent}</p>
                        <Link
                          href={`/lineup/${m.id}?teamId=${team.id}`}
                          className="text-xs font-semibold text-brand-400 hover:text-brand-300 border border-brand-500/40 rounded px-2 py-0.5 transition-colors shrink-0"
                        >
                          Submit Lineup →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
