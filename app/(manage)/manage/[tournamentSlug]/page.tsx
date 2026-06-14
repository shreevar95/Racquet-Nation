import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { formatDate, formatTime } from '@/lib/utils'
import { publishTournament } from '@/actions/tournament'
import { CancelTournamentButton } from './CancelTournamentButton'

interface Props {
  params: Promise<{ tournamentSlug: string }>
}

export const metadata: Metadata = { title: 'Manage Tournament' }

export default async function ManageOverviewPage({ params }: Props) {
  const { tournamentSlug } = await params
  const user = await requireAuth()

  const tournament = await prisma.tournament.findUnique({
    where: { slug: tournamentSlug },
    include: {
      sport: { select: { name: true } },
      _count: {
        select: { registrations: true, teams: true, matches: true },
      },
      matches: {
        where: { status: { in: ['LOCKED', 'TIEBREAK_REQUIRED'] } },
        include: {
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      },
    },
  })
  if (!tournament) notFound()
  if (!(await canManageTournament(user.id, tournament.id))) notFound()

  const [pendingRegistrations, groups] = await Promise.all([
    prisma.registration.count({
      where: { tournamentId: tournament.id, status: 'APPLIED' },
    }),
    prisma.tournamentGroup.findMany({
      where: { tournamentId: tournament.id },
      orderBy: { order: 'asc' },
      include: {
        standings: {
          orderBy: { position: 'asc' },
          include: { team: { select: { name: true, slug: true } } },
        },
      },
    }),
  ])

  return (
    <div className="space-y-6">

      {/* Publish CTA */}
      {tournament.status === 'DRAFT' && (
        <div className="rounded-lg border border-brand-500/40 bg-brand-500/8 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-display font-bold text-base uppercase text-text-primary">Draft — Not Published</p>
            <p className="text-sm text-text-secondary mt-0.5">
              Publish to open registrations and make this tournament public.
            </p>
          </div>
          <form action={async () => {
            'use server'
            await publishTournament(tournament.id)
          }}>
            <Button type="submit" className="font-display font-bold uppercase tracking-wide shrink-0">
              Publish
            </Button>
          </form>
        </div>
      )}

      {/* Action alerts */}
      {pendingRegistrations > 0 && (
        <Link href={`/manage/${tournamentSlug}/registrations`}>
          <div className="rounded-lg border border-warning/40 bg-warning-bg p-4 flex items-center justify-between hover:border-warning/60 transition-colors">
            <div>
              <p className="text-sm font-display font-bold uppercase text-warning">
                {pendingRegistrations} Registration{pendingRegistrations > 1 ? 's' : ''} Pending
              </p>
              <p className="text-xs text-text-secondary mt-0.5">Approve or reject applicants</p>
            </div>
            <span className="text-xs text-warning font-semibold shrink-0">Review →</span>
          </div>
        </Link>
      )}

      {tournament.matches.filter((m) => m.status === 'TIEBREAK_REQUIRED').map((m) => (
        <Link key={m.id} href={`/manage/${tournamentSlug}/scoring/${m.id}`}>
          <div className="rounded-lg border border-warning/40 bg-warning-bg p-4 flex items-center justify-between hover:border-warning/60 transition-colors">
            <p className="text-sm font-display font-bold uppercase text-warning">
              Tiebreak: {m.homeTeam.name} vs {m.awayTeam.name}
            </p>
            <span className="text-xs text-warning font-semibold shrink-0">Enter score →</span>
          </div>
        </Link>
      ))}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Registrations', value: tournament._count.registrations, href: 'registrations' },
          { label: 'Teams',         value: tournament._count.teams,         href: 'teams' },
          { label: 'Matches',       value: tournament._count.matches,       href: 'scoring' },
        ].map((stat) => (
          <Link key={stat.href} href={`/manage/${tournamentSlug}/${stat.href}`}>
            <div className="rounded-lg bg-surface-raised border border-border p-4 text-center hover:border-brand-500/50 transition-colors group">
              <p className="font-display font-black text-3xl text-text-primary leading-none group-hover:text-brand-400 transition-colors">
                {stat.value}
              </p>
              <p className="text-xs text-text-muted uppercase tracking-wider mt-1.5">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Ready to score */}
      {tournament.matches.filter((m) => m.status === 'LOCKED').length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-brand-500" />
            <p className="text-brand-500 text-xs font-bold tracking-[0.15em] uppercase font-display">
              Ready to Score
            </p>
          </div>
          {tournament.matches
            .filter((m) => m.status === 'LOCKED')
            .map((m) => (
              <Link
                key={m.id}
                href={`/manage/${tournamentSlug}/scoring/${m.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-4 hover:border-brand-500/50 transition-colors group border-l-[3px] border-l-brand-500/40 hover:border-l-brand-500"
              >
                <div>
                  <p className="font-semibold text-text-primary group-hover:text-brand-400 transition-colors">
                    {m.homeTeam.name} <span className="text-text-muted font-normal">vs</span> {m.awayTeam.name}
                  </p>
                  {m.scheduledAt && (
                    <p className="text-xs text-text-muted mt-0.5">{formatTime(m.scheduledAt)}</p>
                  )}
                </div>
                <Button size="sm" className="font-display font-bold uppercase tracking-wide shrink-0">
                  Enter Score
                </Button>
              </Link>
            ))}
        </div>
      )}

      {/* Cancelled banner */}
      {tournament.status === 'CANCELLED' && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/8 p-4 text-center">
          <p className="font-display font-bold uppercase text-red-400 text-sm tracking-wide">
            Tournament Cancelled
          </p>
          <p className="text-xs text-text-secondary mt-1">
            This tournament has been cancelled and is no longer publicly listed.
          </p>
        </div>
      )}

      {/* Points table */}
      {groups.some((g) => g.standings.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-brand-500" />
            <p className="text-brand-500 text-xs font-bold tracking-[0.15em] uppercase font-display">
              Points Table
            </p>
          </div>
          {groups.map((group) =>
            group.standings.length > 0 ? (
              <div key={group.id} className="rounded-lg border border-border bg-surface-raised overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-surface-overlay">
                  <p className="text-xs font-display font-bold uppercase tracking-wider text-text-muted">{group.name}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border text-text-muted">
                        <th className="text-left px-4 py-2 font-semibold w-6">#</th>
                        <th className="text-left px-2 py-2 font-semibold">Team</th>
                        <th className="text-center px-2 py-2 font-semibold">P</th>
                        <th className="text-center px-2 py-2 font-semibold">W</th>
                        <th className="text-center px-2 py-2 font-semibold">L</th>
                        <th className="text-center px-2 py-2 font-semibold">GW</th>
                        <th className="text-center px-2 py-2 font-semibold">GL</th>
                        <th className="text-center px-2 py-2 font-semibold text-brand-400">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.standings.map((row) => (
                        <tr key={row.teamId} className="hover:bg-surface-overlay transition-colors">
                          <td className={['px-4 py-2.5 font-black font-display', row.position === 1 ? 'text-brand-500' : 'text-text-muted'].join(' ')}>
                            {row.position}
                          </td>
                          <td className="px-2 py-2.5 font-semibold text-text-primary">{row.team.name}</td>
                          <td className="px-2 py-2.5 text-center text-text-secondary">{row.matchesPlayed}</td>
                          <td className="px-2 py-2.5 text-center text-text-secondary">{row.matchesWon}</td>
                          <td className="px-2 py-2.5 text-center text-text-secondary">{row.matchesLost}</td>
                          <td className="px-2 py-2.5 text-center text-text-secondary">{row.gamesWon}</td>
                          <td className="px-2 py-2.5 text-center text-text-secondary">{row.gamesLost}</td>
                          <td className="px-2 py-2.5 text-center font-black text-brand-400 font-display">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}

      {/* Danger zone */}
      {tournament.status !== 'CANCELLED' && tournament.status !== 'ARCHIVED' && (
        <div className="pt-4 border-t border-border flex justify-end">
          <CancelTournamentButton tournamentId={tournament.id} tournamentName={tournament.name} />
        </div>
      )}

    </div>
  )
}
