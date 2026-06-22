'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import type { CreateTournamentInput } from '@/types/tournament'
import { GAME_TYPE_OPTIONS } from '@/lib/gameTypes'

interface Props {
  data: CreateTournamentInput
  update: (patch: Partial<CreateTournamentInput>) => void
  onNext: () => void
}

interface NumFieldProps {
  label: string
  value: number
  min: number
  max?: number
  onChange: (n: number) => void
}

function NumField({ label, value, min, max, onChange }: NumFieldProps) {
  const [raw, setRaw] = useState(String(value))

  useEffect(() => {
    setRaw(String(value))
  }, [value])

  return (
    <Input
      label={label}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={raw}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^0-9]/g, '')
        setRaw(digits)
        const n = parseInt(digits)
        if (!isNaN(n) && n >= min && (max === undefined || n <= max)) onChange(n)
      }}
      onBlur={() => {
        const n = parseInt(raw)
        let clamped = isNaN(n) ? min : Math.max(min, n)
        if (max !== undefined) clamped = Math.min(max, clamped)
        setRaw(String(clamped))
        onChange(clamped)
      }}
    />
  )
}

const POINTS_PRESETS = [11, 15, 21]
const GAMES_PRESETS = [
  { label: 'Best of 3', value: 3 },
  { label: 'Best of 4', value: 4 },
  { label: 'Best of 5', value: 5 },
]

export function Step3Format({ data, update }: Props) {
  const { matchFormat, scoringConfig } = data
  const hasKnockout = matchFormat.tournamentStructure === 'GROUP_STAGE_PLUS_KNOCKOUT' || matchFormat.tournamentStructure === 'KNOCKOUT_ONLY'

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-text-primary mb-3">Match Format</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Match Type</label>
            <select
              value={matchFormat.matchType}
              onChange={(e) =>
                update({
                  matchFormat: {
                    ...matchFormat,
                    matchType: e.target.value as 'SINGLES' | 'DOUBLES' | 'MIXED_DOUBLES',
                    playersPerSide: e.target.value === 'SINGLES' ? 1 : 2,
                  },
                })
              }
              className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
            >
              <option value="SINGLES">Singles</option>
              <option value="DOUBLES">Doubles</option>
              <option value="MIXED_DOUBLES">Mixed Doubles</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Group Stage — Games per Match</label>
            <div className="flex gap-2">
              {GAMES_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => update({ matchFormat: { ...matchFormat, gamesPerMatch: p.value } })}
                  className={[
                    'flex-1 rounded-md border py-2 text-sm font-semibold transition-all',
                    matchFormat.gamesPerMatch === p.value
                      ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                      : 'border-border bg-surface-raised text-text-secondary hover:border-brand-500/50',
                  ].join(' ')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Per-game type selectors */}
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-text-secondary">Game Types</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: matchFormat.gamesPerMatch }, (_, i) => i + 1).map((game) => (
              <div key={game} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-muted">Game {game}</label>
                <select
                  value={matchFormat.gameTypes?.[String(game)] ?? ''}
                  onChange={(e) =>
                    update({
                      matchFormat: {
                        ...matchFormat,
                        gameTypes: {
                          ...(matchFormat.gameTypes ?? {}),
                          [String(game)]: e.target.value,
                        },
                      },
                    })
                  }
                  className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Not specified</option>
                  {GAME_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={matchFormat.tiebreakEnabled}
              onChange={(e) =>
                update({ matchFormat: { ...matchFormat, tiebreakEnabled: e.target.checked } })
              }
              className="w-4 h-4 rounded border-border accent-brand-500"
            />
            <span className="text-sm text-text-secondary">Enable tiebreak game on draw</span>
          </label>
        </div>
      </div>

      {/* Knockout format — shown when structure includes knockout */}
      {hasKnockout && (
        <div className="space-y-4 border border-border rounded-lg p-4 bg-surface">
          <p className="text-sm font-semibold text-text-primary">Final Stage Format</p>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Games per Match</label>
            <div className="flex gap-2">
              {GAMES_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => update({ matchFormat: { ...matchFormat, knockoutGamesPerMatch: p.value } })}
                  className={[
                    'flex-1 rounded-md border py-2 text-sm font-semibold transition-all',
                    (matchFormat.knockoutGamesPerMatch ?? matchFormat.gamesPerMatch) === p.value
                      ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                      : 'border-border bg-surface-raised text-text-secondary hover:border-brand-500/50',
                  ].join(' ')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Points to Win a Game</label>
            <div className="flex gap-2">
              {POINTS_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update({ matchFormat: { ...matchFormat, knockoutPointsToWin: p } })}
                  className={[
                    'flex-1 rounded-md border py-2.5 text-base font-black font-display transition-all',
                    (matchFormat.knockoutPointsToWin ?? scoringConfig.pointsToWin) === p
                      ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                      : 'border-border bg-surface-raised text-text-secondary hover:border-brand-500/50',
                  ].join(' ')}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted">Leave unset to use the same points as group stage ({scoringConfig.pointsToWin})</p>
            <NumField
              label=""
              value={matchFormat.knockoutPointsToWin ?? scoringConfig.pointsToWin}
              min={1}
              onChange={(n) => update({ matchFormat: { ...matchFormat, knockoutPointsToWin: n } })}
            />
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-text-primary mb-3">Scoring Rules</p>
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Points to Win a Game</label>
            <div className="flex gap-2">
              {POINTS_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => update({ scoringConfig: { ...scoringConfig, pointsToWin: p } })}
                  className={[
                    'flex-1 rounded-md border py-2.5 text-base font-black font-display transition-all',
                    scoringConfig.pointsToWin === p
                      ? 'border-brand-500 bg-brand-500/15 text-brand-400'
                      : 'border-border bg-surface-raised text-text-secondary hover:border-brand-500/50',
                  ].join(' ')}
                >
                  {p}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-muted">Or type a custom value below</p>
            <NumField
              label=""
              value={scoringConfig.pointsToWin}
              min={1}
              onChange={(n) => update({ scoringConfig: { ...scoringConfig, pointsToWin: n } })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumField
              label="Win Margin Required"
              value={scoringConfig.winMargin}
              min={1}
              onChange={(n) => update({ scoringConfig: { ...scoringConfig, winMargin: n } })}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Scoring Method</label>
              <select
                value={scoringConfig.scoringMethod}
                onChange={(e) =>
                  update({
                    scoringConfig: {
                      ...scoringConfig,
                      scoringMethod: e.target.value as 'RALLY' | 'SIDE_OUT',
                    },
                  })
                }
                className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                <option value="RALLY">Rally scoring</option>
                <option value="SIDE_OUT">Side-out scoring</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {matchFormat.tiebreakEnabled && (
        <div>
          <p className="text-sm font-semibold text-text-primary mb-3">Tiebreak Game</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <NumField
              label="Points to Win Tiebreak"
              value={data.tiebreakConfig.pointsToWin}
              min={1}
              onChange={(n) => update({ tiebreakConfig: { ...data.tiebreakConfig, pointsToWin: n } })}
            />
            <NumField
              label="Win Margin"
              value={data.tiebreakConfig.winMargin}
              min={1}
              onChange={(n) => update({ tiebreakConfig: { ...data.tiebreakConfig, winMargin: n } })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
