import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate, formatTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'My Matches' }

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: 'Upcoming',
  OPEN_FOR_SUBMISSION: 'Submit Lineup',
  LOCKED: 'Locked',
  IN_PROGRESS: 'Live',
  TIEBREAK_REQUIRED: 'Tiebreak',
  COMPLETED: 'Completed',
}

const STATUS_COLOR: Record<string, string> = {
  UPCOMING: 'text-text-muted',
  OPEN_FOR_SUBMISSION: 'text-brand-400',
  LOCKED: 'text-info',
  IN_PROGRESS: 'text-success',
  TIEBREAK_REQUIRED: 'text-warning',
  COMPLETED: 'text-text-muted',
}

export default async function MyMatchesPage() {
  const user = await requireAuth()

  const playerProfile = await prisma.playerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })

  const allMatches = playerProfile
    ? await prisma.match.findMany({
        where: {
          OR: [
            { homeTeam: { memberships: { some: { playerId: playerProfile.id } } } },
            { awayTeam: { memberships: { some: { playerId: playerProfile.id } } } },
          ],
        },
        include: {
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
          tournament: { select: { id: true, name: true, slug: true } },
          group: { select: { name: true } },
        },
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
      })
    : []

  // Also get captain team IDs so we can show lineup CTAs
  const captainTeamIds = new Set<string>()
  if (playerProfile) {
    const captainships = await prisma.teamMembership.findMany({
      where: { playerId: playerProfile.id, role: 'CAPTAIN' },
      select: { teamId: true },
    })
    captainships.forEach((c) => captainTeamIds.add(c.teamId))
  }

  const activeStatuses = ['UPCOMING', 'OPEN_FOR_SUBMISSION', 'LOCKED', 'IN_PROGRESS', 'TIEBREAK_REQUIRED']
  const active = allMatches.filter((m) => activeStatuses.includes(m.status))
  const past = allMatches.filter((m) => m.status === 'COMPLETED')

  // Group past matches by tournament
  const pastByTournament: Record<string, typeof past> = {}
  for (const m of past) {
    ;(pastByTournament[m.tournament.id] ??= []).push(m)
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">

      <div className="border-b border-border pb-5">
        <p className="text-brand-500 text-xs font-bold tracking-[0.2em] uppercase font-display mb-1">
          Player
        </p>
        <h1 className="font-display font-black text-4xl uppercase text-text-primary leading-tight">
          My Matches
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          All your tournament matches across seasons.
        </p>
      </div>

      {allMatches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="font-display font-bold text-lg uppercase text-text-muted">No matches yet</p>
          <p className="text-text-muted text-sm mt-2">Register for a tournament to get started.</p>
          <Link
            href="/tournaments"
            className="inline-block mt-4 text-brand-500 text-sm font-semibold hover:text-brand-400 transition-colors"
          >
            Browse Tournaments →
          </Link>
        </div>
      ) : (
        <>
          {/* Active & Upcoming */}
          {active.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-4 bg-brand-500" />
                <p className="text-brand-500 text-xs font-bold tracking-[0.2em] uppercase font-display">
                  Upcoming & Live
                </p>
              </div>

              <div className="rounded-lg border border-border bg-surface-raised overflow-hidden divide-y divide-border">
                {active.map((m) => {
                  const isMyTeamMatch =
                    captainTeamIds.has(m.homeTeam.id) || captainTeamIds.has(m.awayTeam.id)
                  const captainTeamId =
                    (m.status === 'OPEN_FOR_SUBMISSION' || m.status === 'TIEBREAK_REQUIRED') && isMyTeamMatch
                      ? (captainTeamIds.has(m.homeTeam.id) ? m.homeTeam.id : m.awayTeam.id)
                      : null

                  return (
                    <div key={m.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {m.homeTeam.name} <span className="text-text-muted font-normal">vs</span> {m.awayTeam.name}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {m.tournament.name}
                            {m.group && ` · ${m.group.name}`}
                          </p>
                          {m.scheduledAt && (
                            <p className="text-xs text-text-muted mt-0.5">
                              {formatDate(m.scheduledAt)} · {formatTime(m.scheduledAt)}
                              {m.court && ` · ${m.court}`}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className={['text-xs font-bold uppercase', STATUS_COLOR[m.status] ?? 'text-text-muted'].join(' ')}>
                            {STATUS_LABEL[m.status] ?? m.status}
                          </span>
                          {captainTeamId && (
                            <Link
                              href={`/lineup/${m.id}?teamId=${captainTeamId}`}
                              className="text-[11px] font-bold text-brand-400 hover:text-brand-300 border border-brand-500/40 rounded px-2 py-0.5 transition-colors"
                            >
                              Submit Lineup →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Past matches grouped by tournament */}
          {past.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-0.5 w-4 bg-border" />
                <p className="text-text-muted text-xs font-bold tracking-[0.2em] uppercase font-display">
                  Past Matches
                </p>
              </div>

              {Object.values(pastByTournament).map((matches) => {
                const t = matches[0].tournament
                return (
                  <div key={t.id} className="rounded-lg border border-border bg-surface-raised overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-border bg-surface-overlay flex items-center justify-between">
                      <p className="text-xs font-display font-bold uppercase tracking-wider text-text-muted truncate">
                        {t.name}
                      </p>
                      <Link
                        href={`/tournaments/${t.slug}/results`}
                        className="text-[11px] text-text-muted hover:text-brand-400 transition-colors shrink-0 ml-3"
                      >
                        Full results →
                      </Link>
                    </div>
                    <div className="divide-y divide-border">
                      {matches.map((m) => {
                        const homeWon = m.winnerId === m.homeTeam.id
                        const awayWon = m.winnerId === m.awayTeam.id
                        return (
                          <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-text-primary truncate">
                                <span className={homeWon ? 'font-bold' : 'text-text-secondary'}>
                                  {m.homeTeam.name}
                                </span>
                                <span className="text-text-muted mx-1.5 font-normal">vs</span>
                                <span className={awayWon ? 'font-bold' : 'text-text-secondary'}>
                                  {m.awayTeam.name}
                                </span>
                              </p>
                              {m.scheduledAt && (
                                <p className="text-xs text-text-muted mt-0.5">
                                  {formatDate(m.scheduledAt)}
                                  {m.group && ` · ${m.group.name}`}
                                </p>
                              )}
                            </div>
                            {m.homeTeamScore !== null && m.awayTeamScore !== null && (
                              <p className="text-sm font-black tabular-nums text-text-primary shrink-0 font-display">
                                {m.homeTeamScore}–{m.awayTeamScore}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </section>
          )}
        </>
      )}
    </div>
  )
}
