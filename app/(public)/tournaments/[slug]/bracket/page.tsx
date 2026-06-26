import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Trophy } from 'lucide-react'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { cn } from '@/lib/utils'

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
            include: { team: { select: { id: true, name: true, slug: true, primaryColor: true, logoUrl: true } } },
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
  const qualifiers: Qualifier[] = []
  for (const group of groupStageGroups) {
    const advancers = group.standings.slice(0, teamsAdvance)
    for (const s of advancers) {
      qualifiers.push({
        teamId: s.teamId,
        teamName: s.team.name,
        groupName: group.name,
        position: s.position,
        primaryColor: s.team.primaryColor,
        logoUrl: s.team.logoUrl,
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
            <RnCard className="border-dashed p-8 text-center">
              <Trophy className="mx-auto mb-3 text-saffron" size={28} />
              <p className="text-sm text-rn-text-secondary">
                Final stage will appear once group stage is complete.
              </p>
            </RnCard>
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
            <RnCard className="border-dashed p-8 text-center">
              <p className="text-sm text-rn-text-secondary">
                Knockout bracket will appear once group stage is complete.
              </p>
            </RnCard>
          ) : (
            <div className="overflow-x-auto pb-4">
              <KnockoutBracket qualifiers={qualifiers} bracketSize={bracketSize} rounds={rounds} />
            </div>
          )}
        </div>
      )}

      {/* Pure knockout (no groups) */}
      {structure === 'KNOCKOUT_ONLY' && (
        <RnCard className="border-dashed p-8 text-center">
          <Trophy className="mx-auto mb-3 text-saffron" size={32} />
          <p className="text-sm text-rn-text-secondary">
            Knockout bracket will be shown here once matches are scheduled.
          </p>
        </RnCard>
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
    team: { id: string; name: string; slug: string; primaryColor: string | null; logoUrl: string | null }
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
    <RnCard className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-rn-border px-4 py-2.5">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-rn-text-muted">
          {group.name}
        </p>
        <p className="text-[10px] text-rn-text-muted">
          {group.matches.length} played
        </p>
      </div>

      <div className="divide-y divide-rn-border">
        {group.standings.map((row) => {
          const advances = teamsAdvance > 0 && row.position <= teamsAdvance
          return (
            <div
              key={row.teamId}
              className={cn(
                'flex items-center gap-2.5 px-4 py-2.5',
                advances && 'border-l-2 border-saffron bg-saffron-tint',
              )}
            >
              <span className="w-4 shrink-0 text-center font-nunito text-xs font-black text-saffron">
                {row.position}
              </span>
              <RnTeamTile name={row.team.name} color={row.team.primaryColor} logoUrl={row.team.logoUrl} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">
                {row.team.name}
              </span>
              <span className="w-16 shrink-0 text-right text-xs tabular-nums">
                <span className="font-bold text-rn-green">{row.matchesWon}W</span>
                {' '}
                <span className="font-bold text-red-down">{row.matchesLost}L</span>
                {row.matchesDrawn > 0 && <span className="text-rn-text-muted"> {row.matchesDrawn}D</span>}
              </span>
              <span className="w-7 shrink-0 text-right font-nunito text-xs font-black text-ink">
                {row.points}
              </span>
            </div>
          )
        })}
        {group.standings.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-rn-text-muted">
            No results yet
          </div>
        )}
      </div>

    </RnCard>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="h-0.5 w-4 bg-saffron" />
      <p className="text-xs font-extrabold uppercase tracking-[.15em] text-saffron">
        {label}
      </p>
    </div>
  )
}

export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 2
  let p = 2
  while (p < n) p *= 2
  return p
}

export function buildBracketRounds(size: number): string[] {
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
  primaryColor: string | null
  logoUrl: string | null
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
            <div key="winner" className="flex min-w-[120px] flex-col items-center justify-center px-4">
              <Trophy size={24} className="mb-2 text-saffron" />
              <div className="rounded-lg border-2 border-saffron/40 bg-saffron-tint px-3 py-2 text-center">
                <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-saffron">Champion</p>
                <p className="text-xs italic text-rn-text-muted">TBD</p>
              </div>
            </div>
          )
        }

        const slotHeight = 72
        const rowHeight = slotHeight * 2 * Math.pow(2, roundIdx)

        return (
          <div key={roundLabel} className="flex flex-col" style={{ minWidth: 160 }}>
            <p className="mb-3 px-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-rn-text-muted">
              {roundLabel}
            </p>
            <div className="flex flex-1 flex-col">
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
                      <RnCard className="overflow-hidden">
                        <MatchSlot team={top} />
                        <div className="h-px bg-rn-border" />
                        <MatchSlot team={bottom} />
                      </RnCard>
                    </div>
                    {roundIdx < roundCount - 1 && (
                      <div className="flex w-4 flex-col self-stretch">
                        <div className="flex-1 border-r border-rn-border" />
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
    <div className="flex min-h-[36px] items-center gap-2 px-3 py-2">
      {team ? (
        <>
          <RnTeamTile name={team.teamName} color={team.primaryColor} logoUrl={team.logoUrl} size="sm" />
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-xs font-extrabold text-ink">{team.teamName}</p>
            <p className="text-[10px] text-rn-text-secondary">{team.groupName} #{team.position}</p>
          </div>
        </>
      ) : (
        <p className="text-xs italic text-rn-text-muted">TBD</p>
      )}
    </div>
  )
}
