import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { canManageTournament } from '@/lib/permissions'
import { RnCard } from '@/components/rn/RnCard'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { formatTime } from '@/lib/utils'
import { publishTournament, closeRegistration, reopenRegistration } from '@/actions/tournament'
import { cn } from '@/lib/utils'
import { CancelTournamentButton } from './CancelTournamentButton'
import { CancelledTournamentActions } from '@/app/(admin)/admin/tournaments/CancelledTournamentActions'

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
    <div className="space-y-6 pt-6">

      {/* Publish CTA */}
      {tournament.status === 'DRAFT' && (
        <RnCard className="flex flex-col gap-3 border-saffron/30 bg-saffron-tint p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-nunito text-base font-extrabold uppercase text-ink">Draft — Not Published</p>
            <p className="mt-0.5 text-sm text-rn-text-secondary">
              Publish to open registrations and make this tournament public.
            </p>
          </div>
          <form action={async () => {
            'use server'
            await publishTournament(tournament.id)
          }}>
            <button type="submit" className={cn(rnButtonVariants({ variant: 'primary' }), 'w-full sm:w-auto')}>
              Publish
            </button>
          </form>
        </RnCard>
      )}

      {/* Close registration CTA */}
      {tournament.status === 'REGISTRATION_OPEN' && (
        <RnCard className="flex flex-col gap-3 border-rn-green/30 bg-rn-green/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-rn-green">Registration is open</p>
            <p className="mt-0.5 text-xs text-rn-text-secondary">
              Close the waitlist to stop accepting new applicants.
            </p>
          </div>
          <form action={async () => {
            'use server'
            await closeRegistration(tournament.id)
          }}>
            <button type="submit" className={cn(rnButtonVariants({ variant: 'secondary', size: 'sm' }), 'w-full sm:w-auto')}>
              Close Registration
            </button>
          </form>
        </RnCard>
      )}

      {/* Re-open registration CTA */}
      {tournament.status === 'REGISTRATION_CLOSED' && (
        <RnCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-ink">Registration is closed</p>
            <p className="mt-0.5 text-xs text-rn-text-secondary">
              Re-open to accept more applicants.
            </p>
          </div>
          <form action={async () => {
            'use server'
            await reopenRegistration(tournament.id)
          }}>
            <button type="submit" className={cn(rnButtonVariants({ variant: 'secondary', size: 'sm' }), 'w-full sm:w-auto')}>
              Re-open Registration
            </button>
          </form>
        </RnCard>
      )}

      {/* Action alerts */}
      {pendingRegistrations > 0 && (
        <Link href={`/manage/${tournamentSlug}/registrations`}>
          <RnCard className="flex items-center justify-between border-rn-yellow/40 bg-rn-yellow/15 p-4 transition-colors hover:border-rn-yellow">
            <div>
              <p className="font-nunito text-sm font-extrabold uppercase text-ink">
                {pendingRegistrations} Registration{pendingRegistrations > 1 ? 's' : ''} Pending
              </p>
              <p className="mt-0.5 text-xs text-rn-text-secondary">Approve or reject applicants</p>
            </div>
            <span className="shrink-0 text-xs font-extrabold text-ink">Review →</span>
          </RnCard>
        </Link>
      )}

      {tournament.matches.filter((m) => m.status === 'TIEBREAK_REQUIRED').map((m) => (
        <Link key={m.id} href={`/manage/${tournamentSlug}/scoring/${m.id}`}>
          <RnCard className="flex items-center justify-between border-rn-yellow/40 bg-rn-yellow/15 p-4 transition-colors hover:border-rn-yellow">
            <p className="font-nunito text-sm font-extrabold uppercase text-ink">
              Tiebreak: {m.homeTeam.name} vs {m.awayTeam.name}
            </p>
            <span className="shrink-0 text-xs font-extrabold text-ink">Enter score →</span>
          </RnCard>
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
            <RnCard className="rn-card-hover p-3 text-center sm:p-4">
              <p className="font-nunito text-2xl font-black leading-none text-ink sm:text-3xl">
                {stat.value}
              </p>
              <p className="mt-1.5 text-[10px] uppercase tracking-wide text-rn-text-muted sm:text-xs">{stat.label}</p>
            </RnCard>
          </Link>
        ))}
      </div>

      {/* Ready to score */}
      {tournament.matches.filter((m) => m.status === 'LOCKED').length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-saffron" />
            <p className="text-xs font-extrabold uppercase tracking-[.15em] text-saffron">
              Ready to Score
            </p>
          </div>
          {tournament.matches
            .filter((m) => m.status === 'LOCKED')
            .map((m) => (
              <Link key={m.id} href={`/manage/${tournamentSlug}/scoring/${m.id}`}>
                <RnCard className="rn-card-hover flex flex-col gap-3 border-l-[3px] border-l-saffron/40 p-4 hover:border-l-saffron sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-ink">
                      {m.homeTeam.name} <span className="font-normal text-rn-text-muted">vs</span> {m.awayTeam.name}
                    </p>
                    {m.scheduledAt && (
                      <p className="mt-0.5 text-xs text-rn-text-muted">{formatTime(m.scheduledAt)}</p>
                    )}
                  </div>
                  <span className={cn(rnButtonVariants({ variant: 'primary', size: 'sm' }), 'w-full sm:w-auto')}>
                    Enter Score
                  </span>
                </RnCard>
              </Link>
            ))}
        </div>
      )}

      {/* Cancelled banner */}
      {tournament.status === 'CANCELLED' && (
        <RnCard className="flex flex-col gap-3 border-red-down/30 bg-red-down/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-nunito text-sm font-extrabold uppercase tracking-wide text-red-down">
              Tournament Cancelled
            </p>
            <p className="mt-1 text-xs text-rn-text-secondary">
              Revive to restore as Draft, or permanently delete.
            </p>
          </div>
          <CancelledTournamentActions tournamentId={tournament.id} tournamentName={tournament.name} />
        </RnCard>
      )}

      {/* Points table */}
      {groups.some((g) => g.standings.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-saffron" />
            <p className="text-xs font-extrabold uppercase tracking-[.15em] text-saffron">
              Points Table
            </p>
          </div>
          {groups.map((group) =>
            group.standings.length > 0 ? (
              <RnCard key={group.id} className="overflow-hidden">
                <div className="border-b border-rn-border px-4 py-2.5">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">{group.name}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-rn-border text-rn-text-muted">
                        <th className="w-6 px-4 py-2 text-left font-bold">#</th>
                        <th className="px-2 py-2 text-left font-bold">Team</th>
                        <th className="px-2 py-2 text-center font-bold">P</th>
                        <th className="px-2 py-2 text-center font-bold">W</th>
                        <th className="px-2 py-2 text-center font-bold">L</th>
                        <th className="px-2 py-2 text-center font-bold">GW</th>
                        <th className="px-2 py-2 text-center font-bold">GL</th>
                        <th className="px-2 py-2 text-center font-bold text-saffron">Pts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rn-border">
                      {group.standings.map((row) => (
                        <tr key={row.teamId} className="transition-colors hover:bg-saffron-tint">
                          <td className={cn('px-4 py-2.5 font-nunito font-black', row.position === 1 ? 'text-saffron' : 'text-rn-text-muted')}>
                            {row.position}
                          </td>
                          <td className="px-2 py-2.5 font-bold text-ink">{row.team.name}</td>
                          <td className="px-2 py-2.5 text-center text-rn-text-secondary">{row.matchesPlayed}</td>
                          <td className="px-2 py-2.5 text-center font-extrabold text-rn-green">{row.matchesWon}</td>
                          <td className="px-2 py-2.5 text-center font-extrabold text-red-down">{row.matchesLost}</td>
                          <td className="px-2 py-2.5 text-center text-rn-text-secondary">{row.gamesWon}</td>
                          <td className="px-2 py-2.5 text-center text-rn-text-secondary">{row.gamesLost}</td>
                          <td className="px-2 py-2.5 text-center font-nunito font-black text-ink">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </RnCard>
            ) : null,
          )}
        </div>
      )}

      {/* Danger zone */}
      {tournament.status !== 'CANCELLED' && tournament.status !== 'ARCHIVED' && (
        <div className="flex justify-end border-t border-rn-border pt-4">
          <CancelTournamentButton tournamentId={tournament.id} tournamentName={tournament.name} />
        </div>
      )}

    </div>
  )
}
