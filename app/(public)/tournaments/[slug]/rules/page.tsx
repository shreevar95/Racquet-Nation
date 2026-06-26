import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RnCard } from '@/components/rn/RnCard'
import { nextPowerOfTwo, buildBracketRounds } from '../bracket/page'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = { title: 'Rules' }
export const revalidate = 3600

interface MatchFormat {
  matchType: string
  gamesPerMatch: number
  tiebreakEnabled: boolean
  playersPerSide: number
  tournamentStructure?: string
  teamsAdvancePerGroup?: number
  knockoutType?: string
}

export default async function RulesPage({ params }: Props) {
  const { slug } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { slug, isPublic: true },
    select: { rules: true, matchFormat: true, scoringConfig: true, numGroups: true },
  })
  if (!tournament) notFound()

  const format = tournament.matchFormat as unknown as MatchFormat
  const scoring = tournament.scoringConfig as { pointsToWin: number; winMargin: number; scoringMethod: string }

  const structure = format.tournamentStructure
  const hasGroups = structure !== 'KNOCKOUT_ONLY'
  const hasKnockout = structure !== 'GROUP_STAGE_ONLY'
  const isBracketKnockout = format.knockoutType === 'BRACKET'
  const teamsAdvance = format.teamsAdvancePerGroup
  const numGroups = tournament.numGroups

  const canDescribeFormat = !!structure

  return (
    <div className="space-y-5">
      {/* Competition format — derived from the tournament's actual settings */}
      <RnCard className="p-5">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[.15em] text-saffron">Format</p>

        {!canDescribeFormat ? (
          <div className="rounded-xl border border-dashed border-rn-border p-4 text-center">
            <p className="text-sm text-rn-text-muted">
              The organizer hasn&apos;t set up the competition structure yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-sm leading-relaxed text-rn-text-secondary">
            {/* Group stage */}
            {hasGroups && (
              <div>
                <p className="font-extrabold text-ink">Group Stage</p>
                {numGroups ? (
                  <p>
                    {numGroups} group{numGroups !== 1 ? 's' : ''}
                    {teamsAdvance != null && hasKnockout
                      ? ` · top ${teamsAdvance} team${teamsAdvance !== 1 ? 's' : ''} from each group advance${teamsAdvance === 1 ? 's' : ''}`
                      : ''}
                    {!hasKnockout && ' · final standings decide the winner'}
                  </p>
                ) : (
                  <p className="text-rn-text-muted">Number of groups not set yet.</p>
                )}
              </div>
            )}

            {/* Finals / knockout */}
            {hasKnockout && (
              <div>
                <p className="font-extrabold text-ink">{hasGroups ? 'Finals' : 'Knockout'}</p>
                {isBracketKnockout ? (
                  numGroups && teamsAdvance != null ? (
                    (() => {
                      const bracketSize = nextPowerOfTwo(numGroups * teamsAdvance)
                      const rounds = buildBracketRounds(bracketSize).filter((r) => r !== 'Winner')
                      return (
                        <p>
                          Single-elimination bracket ({bracketSize} qualifiers): {rounds.join(' → ')}
                        </p>
                      )
                    })()
                  ) : (
                    <p className="text-rn-text-muted">Bracket size depends on qualifier settings, not yet configured.</p>
                  )
                ) : (
                  <p>Round-robin final group among the qualifying teams — no bracket, best record wins.</p>
                )}
              </div>
            )}

            {/* Per-match format */}
            <div>
              <p className="font-extrabold text-ink">Per Match</p>
              <p>
                {format.gamesPerMatch} match{format.gamesPerMatch !== 1 ? 'es' : ''} per fixture
                {format.tiebreakEnabled && ' + tiebreak if drawn'}
                {' · '}
                {format.playersPerSide} player{format.playersPerSide !== 1 ? 's' : ''} per side
              </p>
              <p>
                Scoring: first to {scoring.pointsToWin}, win by {scoring.winMargin} ({scoring.scoringMethod.replace(/_/g, ' ').toLowerCase()})
              </p>
            </div>
          </div>
        )}
      </RnCard>

      {/* Auto-generated rules from config */}
      <RnCard className="p-5">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[.15em] text-saffron">Match Format</p>
        <div className="space-y-1.5 text-sm leading-relaxed text-rn-text-secondary">
          <p>Format: {format.matchType.replace('_', ' ')}</p>
          <p>Games per match: {format.gamesPerMatch}</p>
          <p>Players per side: {format.playersPerSide}</p>
          <p>Scoring: First to {scoring.pointsToWin}, win by {scoring.winMargin}</p>
          <p>Scoring method: {scoring.scoringMethod.replace('_', ' ')}</p>
          {format.tiebreakEnabled && <p>Tiebreak: 5th game played if match ends {Math.floor(format.gamesPerMatch / 2)}–{Math.floor(format.gamesPerMatch / 2)}</p>}
        </div>
      </RnCard>

      {/* Custom rules */}
      {tournament.rules ? (
        <RnCard className="p-5">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[.15em] text-saffron">Tournament Rules</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-rn-text-secondary">
            {tournament.rules}
          </p>
        </RnCard>
      ) : (
        <RnCard className="border-dashed p-6 text-center">
          <p className="text-sm text-rn-text-muted">No additional rules specified.</p>
        </RnCard>
      )}
    </div>
  )
}
