import type { CreateTournamentInput } from '@/types/tournament'
import { formatDate } from '@/lib/utils'

interface Props {
  data: CreateTournamentInput
  mode?: 'create' | 'edit'
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-rn-border py-2 last:border-0">
      <span className="shrink-0 text-sm text-rn-text-muted">{label}</span>
      <span className="text-right text-sm font-bold text-ink">{value}</span>
    </div>
  )
}

export function Step6Review({ data, mode = 'create' }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">
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
        <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">
          Structure
        </p>
        <Row label="Teams" value={data.numTeams} />
        <Row label="Players per team" value={data.playersPerTeam} />
        <Row label="Groups" value={data.numGroups} />
        <Row label="Total capacity" value={data.numTeams * data.playersPerTeam} />
      </div>

      <div className="space-y-1">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">
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
        <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">
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

      <div className="rounded-lg border border-saffron/30 bg-saffron-tint p-4">
        <p className="text-sm font-bold text-saffron">
          {mode === 'edit'
            ? 'Review your changes — click Save Changes to apply them.'
            : 'Review everything above — you can edit settings after creation from the tournament management dashboard.'}
        </p>
      </div>
    </div>
  )
}
