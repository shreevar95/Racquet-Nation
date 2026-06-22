import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Trophy, ChevronRight } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = { title: 'Bracket' }

export default async function BracketPage({ params }: Props) {
  const { slug } = await params

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      matchFormat: true,
      groups: {
        orderBy: { order: 'asc' },
        include: {
          standings: {
            orderBy: { position: 'asc' },
            include: { team: { select: { id: true, name: true, slug: true } } },
          },
          matches: {
            where: { status: 'COMPLETED' },
            orderBy: [{ scheduledAt: 'asc' }, { matchNumber: 'asc' }],
            select: {
              id: true,
              homeTeamId: true,
              awayTeamId: true,
              winnerId: true,
              homeTeamScore: true,
              awayTeamScore: true,
              homeTeam: { select: { id: true, name: true } },
              awayTeam: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })
  if (!tournament) notFound()

  const fmt = tournament.matchFormat as {
    tournamentStructure?: string
    teamsAdvancePerGroup?: number
    knockoutGamesPerMatch?: number
    knockoutType?: string
  } | null

  const structure = fmt?.tournamentStructure ?? 'GROUP_STAGE_ONLY'
  const teamsAdvance = fmt?.teamsAdvancePerGroup ?? 1
  const hasGroups = structure !== 'KNOCKOUT_ONLY'
  const hasKnockout = structure !== 'GROUP_STAGE_ONLY'
  const isBracketKnockout = fmt?.knockoutType === 'BRACKET'

  // Separate group-stage groups from the Final group
  const groupStageGroups = tournament.groups.filter((g) => g.name !== 'Final')
  const finalGroup = tournament.groups.find((g) => g.name === 'Final')

  // Build qualifier list (teams that advance from each group) — used for bracket only
  const qualifiers: Array<{ teamId: string; teamName: string; groupName: string; position: number }> = []
  for (const group of groupStageGroups) {
    const advancers = group.standings.slice(0, teamsAdvance)
    for (const s of advancers) {
      qualifiers.push({
        teamId: s.teamId,
        teamName: s.team.name,
        groupName: group.name,
        position: s.position,
      })
    }
  }

  const bracketSize = nextPowerOfTwo(qualifiers.length || groupStageGroups.length * teamsAdvance)
  const rounds = buildBracketRounds(bracketSize)

  return (
    <div className="space-y-10">

      {/* Group stage */}
      {hasGroups && groupStageGroups.length > 0 && (
        <div>
          <SectionHeader label="Group Stage" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupStageGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                teamsAdvance={hasKnockout ? teamsAdvance : 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Final stage — Round Robin */}
      {hasKnockout && !isBracketKnockout && (
        <div>
          <SectionHeader label="Final Stage" />
          {!finalGroup ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Trophy className="mx-auto text-brand-500 mb-3" size={28} />
              <p className="text-sm text-text-secondary">
                Final stage will appear once group stage is complete.
              </p>
            </div>
          ) : (
            <div className="max-w-md">
              <GroupCard group={finalGroup} teamsAdvance={0} />
            </div>
          )}
        </div>
      )}

      {/* Final stage — Knockout bracket */}
      {hasKnockout && isBracketKnockout && (
        <div>
          <SectionHeader label="Knockout Bracket" />
          {qualifiers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-text-secondary">
                Knockout bracket will appear once group stage is complete.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <KnockoutBracket qualifiers={qualifiers} bracketSize={bracketSize} rounds={rounds} />
            </div>
          )}
        </div>
      )}

      {/* Pure knockout (no groups) */}
      {structure === 'KNOCKOUT_ONLY' && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Trophy className="mx-auto text-brand-500 mb-3" size={32} />
          <p className="text-sm text-text-secondary">
            Knockout bracket will be shown here once matches are scheduled.
          </p>
        </div>
      )}
    </div>
  )
}

type GroupData = {
  id: string
  name: string
  standings: Array<{
    teamId: string
    position: number
    matchesWon: number
    matchesLost: number
    matchesDrawn: number
    points: number
    team: { id: string; name: string; slug: string }
  }>
  matches: Array<{
    id: string
    homeTeamId: string
    awayTeamId: string
    winnerId: string | null
    homeTeamScore: number | null
    awayTeamScore: number | null
    homeTeam: { id: string; name: string }
    awayTeam: { id: string; name: string }
  }>
}

function GroupCard({ group, teamsAdvance }: { group: GroupData; teamsAdvance: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-surface-overlay flex items-center justify-between">
        <p className="text-xs font-display font-bold uppercase tracking-wider text-text-muted">
          {group.name}
        </p>
        <p className="text-[10px] text-text-muted">
          {group.matches.length} played
        </p>
      </div>

      <div className="divide-y divide-border">
        {group.standings.map((row) => {
          const advances = teamsAdvance > 0 && row.position <= teamsAdvance
          return (
            <div
              key={row.teamId}
              className={['flex items-center gap-2 px-4 py-2.5', advances ? 'bg-brand-500/15 border-l-2 border-brand-500' : ''].join(' ')}
            >
              <span className={['text-xs font-black font-display w-4 shrink-0 text-center', row.position === 1 ? 'text-brand-500' : 'text-text-muted'].join(' ')}>
                {row.position}
              </span>
              <span className="flex-1 text-sm font-semibold text-text-primary truncate min-w-0">
                {row.team.name}
              </span>
              <span className="text-xs tabular-nums shrink-0 w-16 text-right">
                <span className="text-success font-medium">{row.matchesWon}W</span>
                {' '}
                <span className="text-error">{row.matchesLost}L</span>
                {row.matchesDrawn > 0 && <span className="text-text-secondary"> {row.matchesDrawn}D</span>}
              </span>
              <span className="text-xs font-black text-brand-400 font-display w-7 text-right shrink-0">
                {row.points}
              </span>
            </div>
          )
        })}
        {group.standings.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-text-muted">
            No results yet
          </div>
        )}
      </div>

      {group.matches.length > 0 && (
        <div className="border-t border-border px-4 py-2 space-y-1">
          {group.matches.slice(-3).map((m) => (
            <div key={m.id} className="flex items-center justify-between text-[11px] gap-2">
              <span className={['truncate min-w-0 flex-1', m.winnerId === m.homeTeamId ? 'text-text-primary font-semibold' : 'text-text-secondary'].join(' ')}>
                {m.homeTeam.name}
              </span>
              <span className="text-text-muted tabular-nums shrink-0">
                {m.homeTeamScore}–{m.awayTeamScore}
              </span>
              <span className={['truncate min-w-0 flex-1 text-right', m.winnerId === m.awayTeamId ? 'text-text-primary font-semibold' : 'text-text-secondary'].join(' ')}>
                {m.awayTeam.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="h-0.5 w-4 bg-brand-500" />
      <p className="text-brand-500 text-xs font-bold tracking-[0.15em] uppercase font-display">
        {label}
      </p>
    </div>
  )
}

function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 2
  let p = 2
  while (p < n) p *= 2
  return p
}

function buildBracketRounds(size: number): string[] {
  const rounds: string[] = []
  let s = size
  while (s >= 2) {
    if (s === 2) rounds.push('Final')
    else if (s === 4) rounds.push('Semi Finals')
    else if (s === 8) rounds.push('Quarter Finals')
    else rounds.push(`Round of ${s}`)
    s = s / 2
  }
  rounds.push('Winner')
  return rounds
}

interface Qualifier {
  teamId: string
  teamName: string
  groupName: string
  position: number
}

function KnockoutBracket({
  qualifiers,
  bracketSize,
  rounds,
}: {
  qualifiers: Qualifier[]
  bracketSize: number
  rounds: string[]
}) {
  const seeds: (Qualifier | null)[] = Array(bracketSize).fill(null)
  qualifiers.forEach((q, i) => { seeds[i] = q })

  const firstRoundPairs: Array<[Qualifier | null, Qualifier | null]> = []
  for (let i = 0; i < bracketSize; i += 2) {
    firstRoundPairs.push([seeds[i], seeds[i + 1]])
  }

  const roundCount = rounds.length - 1

  return (
    <div className="flex items-stretch gap-0 min-w-max">
      {rounds.map((roundLabel, roundIdx) => {
        const matchCount = bracketSize / Math.pow(2, roundIdx + 1)
        const isWinner = roundLabel === 'Winner'

        if (isWinner) {
          return (
            <div key="winner" className="flex flex-col items-center justify-center px-4 min-w-[120px]">
              <Trophy size={24} className="text-brand-500 mb-2" />
              <div className="rounded-lg border-2 border-brand-500/40 bg-brand-500/10 px-3 py-2 text-center">
                <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-1">Champion</p>
                <p className="text-xs text-text-muted italic">TBD</p>
              </div>
            </div>
          )
        }

        const slotHeight = 72
        const rowHeight = slotHeight * 2 * Math.pow(2, roundIdx)

        return (
          <div key={roundLabel} className="flex flex-col" style={{ minWidth: 160 }}>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider text-center mb-3 px-2">
              {roundLabel}
            </p>
            <div className="flex flex-col flex-1">
              {Array.from({ length: matchCount }).map((_, matchIdx) => {
                const top = roundIdx === 0 ? firstRoundPairs[matchIdx]?.[0] : null
                const bottom = roundIdx === 0 ? firstRoundPairs[matchIdx]?.[1] : null

                return (
                  <div
                    key={matchIdx}
                    className="flex items-center"
                    style={{ height: rowHeight }}
                  >
                    <div className="flex-1 px-2">
                      <div className="rounded-lg border border-border bg-surface-raised overflow-hidden">
                        <MatchSlot team={top} />
                        <div className="h-px bg-border" />
                        <MatchSlot team={bottom} />
                      </div>
                    </div>
                    {roundIdx < roundCount - 1 && (
                      <div className="w-4 self-stretch flex flex-col">
                        <div className="flex-1 border-r border-border" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MatchSlot({ team }: { team: Qualifier | null }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 min-h-[36px]">
      {team ? (
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-xs font-semibold text-text-primary truncate">{team.teamName}</p>
          <p className="text-[10px] text-text-secondary">{team.groupName} #{team.position}</p>
        </div>
      ) : (
        <p className="text-xs text-text-muted italic">TBD</p>
      )}
    </div>
  )
}
