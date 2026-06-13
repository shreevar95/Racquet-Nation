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

export function Step3Format({ data, update }: Props) {
  const { matchFormat, scoringConfig } = data

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

          <NumField
            label="Games per Match"
            value={matchFormat.gamesPerMatch}
            min={1}
            max={9}
            onChange={(n) => update({ matchFormat: { ...matchFormat, gamesPerMatch: n } })}
          />
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

      <div>
        <p className="text-sm font-semibold text-text-primary mb-3">Scoring Rules</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumField
            label="Points to Win a Game"
            value={scoringConfig.pointsToWin}
            min={1}
            onChange={(n) => update({ scoringConfig: { ...scoringConfig, pointsToWin: n } })}
          />
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
