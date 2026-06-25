import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatDate, formatTime } from '@/lib/utils'
import { RnCard } from '@/components/rn/RnCard'

export const metadata: Metadata = { title: 'My Matches' }

const STATUS_LABEL: Record<string, string> = {
  UPCOMING: 'Upcoming',
  OPEN_FOR_SUBMISSION: 'Submit Lineup',
  LOCKED: 'Locked',
  IN_PROGRESS: 'Live',
  TIEBREAK_REQUIRED: 'Tiebreak',
  COMPLETED: 'Completed',
}

const ROW_ACCENTS = ['#F4C24B', '#19A463', '#F26B21', '#3E9BD8']

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
    <div className="min-h-screen bg-paper font-nunito text-ink">
      <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
        <div>
          <p className="mb-1 text-xs font-extrabold tracking-[.2em] uppercase text-saffron">Player</p>
          <h1 className="font-nunito text-3xl font-black uppercase tracking-tight text-ink">My Matches</h1>
          <p className="mt-1 text-sm text-rn-text-secondary">All your tournament matches across seasons.</p>
        </div>

        {allMatches.length === 0 ? (
          <RnCard className="border-dashed p-12 text-center">
            <p className="font-nunito text-lg font-extrabold uppercase text-rn-text-muted">No matches yet</p>
            <p className="mt-2 text-sm text-rn-text-muted">Register for a tournament to get started.</p>
            <Link href="/tournaments" className="mt-4 inline-block text-sm font-extrabold text-saffron">
              Browse Tournaments →
            </Link>
          </RnCard>
        ) : (
          <>
            {/* Active & Upcoming */}
            {active.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-4 bg-saffron" />
                  <p className="text-xs font-extrabold uppercase tracking-[.2em] text-saffron">Upcoming & Live</p>
                </div>

                <div className="flex flex-col gap-2.5">
                  {active.map((m, i) => {
                    const isMyTeamMatch =
                      captainTeamIds.has(m.homeTeam.id) || captainTeamIds.has(m.awayTeam.id)
                    const needsLineup =
                      (m.status === 'OPEN_FOR_SUBMISSION' || m.status === 'TIEBREAK_REQUIRED') && isMyTeamMatch
                    const captainTeamId = needsLineup
                      ? (captainTeamIds.has(m.homeTeam.id) ? m.homeTeam.id : m.awayTeam.id)
                      : null

                    const meta = [
                      m.tournament.name,
                      m.group?.name,
                      m.scheduledAt ? `${formatDate(m.scheduledAt)} · ${formatTime(m.scheduledAt)}` : null,
                      m.court,
                    ]
                      .filter(Boolean)
                      .join(' · ')

                    return (
                      <RnCard key={m.id} className="flex items-center gap-3 p-3.5">
                        <span
                          className="h-[38px] w-1.5 shrink-0 rounded"
                          style={{ background: ROW_ACCENTS[i % ROW_ACCENTS.length] }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-extrabold text-ink">
                            {m.homeTeam.name} <span className="font-normal text-rn-text-muted">vs</span> {m.awayTeam.name}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-rn-text-muted">{meta}</div>
                        </div>
                        {captainTeamId ? (
                          <Link
                            href={`/lineup/${m.id}?teamId=${captainTeamId}`}
                            className="shrink-0 text-[11px] font-extrabold text-saffron"
                          >
                            LINEUP →
                          </Link>
                        ) : (
                          <span className="shrink-0 text-[11px] font-extrabold uppercase text-rn-text-muted">
                            {STATUS_LABEL[m.status] ?? m.status}
                          </span>
                        )}
                      </RnCard>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Past matches grouped by tournament */}
            {past.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="h-0.5 w-4 bg-rn-border" />
                  <p className="text-xs font-extrabold uppercase tracking-[.2em] text-rn-text-muted">Past Matches</p>
                </div>

                {Object.values(pastByTournament).map((matches) => {
                  const t = matches[0].tournament
                  return (
                    <RnCard key={t.id} className="overflow-hidden">
                      <div className="flex items-center justify-between border-b border-rn-border bg-saffron-tint px-4 py-2.5">
                        <p className="truncate text-xs font-extrabold uppercase tracking-wider text-rn-text-secondary">
                          {t.name}
                        </p>
                        <Link
                          href={`/tournaments/${t.slug}/results`}
                          className="ml-3 shrink-0 text-[11px] font-bold text-rn-text-muted transition-colors hover:text-saffron"
                        >
                          Full results →
                        </Link>
                      </div>
                      <div className="divide-y divide-rn-border">
                        {matches.map((m) => {
                          const homeWon = m.winnerId === m.homeTeam.id
                          const awayWon = m.winnerId === m.awayTeam.id
                          return (
                            <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm text-ink">
                                  <span className={homeWon ? 'font-extrabold' : 'text-rn-text-secondary'}>
                                    {m.homeTeam.name}
                                  </span>
                                  <span className="mx-1.5 font-normal text-rn-text-muted">vs</span>
                                  <span className={awayWon ? 'font-extrabold' : 'text-rn-text-secondary'}>
                                    {m.awayTeam.name}
                                  </span>
                                </p>
                                {m.scheduledAt && (
                                  <p className="mt-0.5 text-xs text-rn-text-muted">
                                    {formatDate(m.scheduledAt)}
                                    {m.group && ` · ${m.group.name}`}
                                  </p>
                                )}
                              </div>
                              {m.homeTeamScore !== null && m.awayTeamScore !== null && (
                                <p className="shrink-0 font-nunito text-sm font-black tabular-nums text-ink">
                                  {m.homeTeamScore}–{m.awayTeamScore}
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </RnCard>
                  )
                })}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
