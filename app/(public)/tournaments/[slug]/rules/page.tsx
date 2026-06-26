import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RnCard } from '@/components/rn/RnCard'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = { title: 'Rules' }
export const revalidate = 3600

export default async function RulesPage({ params }: Props) {
  const { slug } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { slug, isPublic: true },
    select: { rules: true, matchFormat: true, scoringConfig: true },
  })
  if (!tournament) notFound()

  const format = tournament.matchFormat as { matchType: string; gamesPerMatch: number; tiebreakEnabled: boolean; playersPerSide: number }
  const scoring = tournament.scoringConfig as { pointsToWin: number; winMargin: number; scoringMethod: string }

  return (
    <div className="space-y-5">
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
