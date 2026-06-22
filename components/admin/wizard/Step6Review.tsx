import type { CreateTournamentInput } from '@/types/tournament'
import { formatDate } from '@/lib/utils'

interface Props {
  data: CreateTournamentInput
  mode?: 'create' | 'edit'
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-border/50 last:border-0 gap-4">
      <span className="text-sm text-text-muted shrink-0">{label}</span>
      <span className="text-sm text-text-primary text-right">{value}</span>
    </div>
  )
}

export function Step6Review({ data, mode = 'create' }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          Basics
        </p>
        <Row label="Name" value={data.name || '—'} />
        <Row
          label="Dates"
          value={
            data.startDate && data.endDate
              ? `${formatDate(data.startDate)} – ${formatDate(data.endDate)}`
              : '—'
          }
        />
        <Row label="Venue" value={data.venue || '—'} />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          Structure
        </p>
        <Row label="Teams" value={data.numTeams} />
        <Row label="Players per team" value={data.playersPerTeam} />
        <Row label="Groups" value={data.numGroups} />
        <Row label="Total capacity" value={data.numTeams * data.playersPerTeam} />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          Format
        </p>
        <Row label="Match type" value={data.matchFormat.matchType.replace('_', ' ')} />
        <Row label="Games per match" value={data.matchFormat.gamesPerMatch} />
        <Row
          label="Scoring"
          value={`First to ${data.scoringConfig.pointsToWin}, win by ${data.scoringConfig.winMargin}`}
        />
        <Row
          label="Tiebreak"
          value={data.matchFormat.tiebreakEnabled ? `Yes — first to ${data.tiebreakConfig.pointsToWin}` : 'No'}
        />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
          Standings
        </p>
        <Row label="Points W/D/L" value={`${data.standingsConfig.pointsForWin} / ${data.standingsConfig.pointsForDraw} / ${data.standingsConfig.pointsForLoss}`} />
        <Row
          label="Tiebreak criteria"
          value={data.standingsConfig.criteria
            .sort((a, b) => a.order - b.order)
            .map((c) => c.field)
            .join(' → ')}
        />
      </div>

      <div className="rounded-lg border border-brand-500/30 bg-brand-500/5 p-4">
        <p className="text-sm text-brand-400 font-medium">
          {mode === 'edit'
            ? 'Review your changes — click Save Changes to apply them.'
            : 'Review everything above — you can edit settings after creation from the tournament management dashboard.'}
        </p>
      </div>
    </div>
  )
}
