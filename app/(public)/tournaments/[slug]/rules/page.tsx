import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'

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
    <div className="space-y-6">
      {/* Auto-generated rules from config */}
      <div className="rounded-lg border border-border bg-surface-raised p-4 space-y-3">
        <p className="text-sm font-semibold text-text-primary">Match Format</p>
        <div className="space-y-1.5 text-sm text-text-secondary">
          <p>Format: {format.matchType.replace('_', ' ')}</p>
          <p>Games per match: {format.gamesPerMatch}</p>
          <p>Players per side: {format.playersPerSide}</p>
          <p>Scoring: First to {scoring.pointsToWin}, win by {scoring.winMargin}</p>
          <p>Scoring method: {scoring.scoringMethod.replace('_', ' ')}</p>
          {format.tiebreakEnabled && <p>Tiebreak: 5th game played if match ends {Math.floor(format.gamesPerMatch / 2)}–{Math.floor(format.gamesPerMatch / 2)}</p>}
        </div>
      </div>

      {/* Custom rules */}
      {tournament.rules ? (
        <div className="rounded-lg border border-border bg-surface-raised p-4">
          <p className="text-sm font-semibold text-text-primary mb-3">Tournament Rules</p>
          <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
            {tournament.rules}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-text-muted text-sm">No additional rules specified.</p>
        </div>
      )}
    </div>
  )
}
