'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import type { CreateTournamentInput, StandingsConfig } from '@/types/tournament'

interface Props {
  data: CreateTournamentInput
  update: (patch: Partial<CreateTournamentInput>) => void
  onNext: () => void
}

const FIELDS = [
  { value: 'matchWins', label: 'Match Wins' },
  { value: 'gameDifferential', label: 'Game Differential' },
  { value: 'headToHead', label: 'Head-to-Head' },
  { value: 'points', label: 'Points' },
] as const

interface NumFieldProps {
  label: string
  value: number
  min: number
  onChange: (n: number) => void
}

function NumField({ label, value, min, onChange }: NumFieldProps) {
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
        if (!isNaN(n) && n >= min) onChange(n)
      }}
      onBlur={() => {
        const n = parseInt(raw)
        const clamped = isNaN(n) ? min : Math.max(min, n)
        setRaw(String(clamped))
        onChange(clamped)
      }}
    />
  )
}

export function Step5Standings({ data, update }: Props) {
  const { standingsConfig } = data

  function updateCriteria(
    index: number,
    patch: Partial<StandingsConfig['criteria'][number]>,
  ) {
    const criteria = [...standingsConfig.criteria]
    criteria[index] = { ...criteria[index], ...patch }
    update({ standingsConfig: { ...standingsConfig, criteria } })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-text-primary">Tiebreaker Priority</p>
        <p className="text-xs text-text-muted">
          When teams are tied, criteria are applied in this order (1 = first).
        </p>
        <div className="space-y-2">
          {standingsConfig.criteria.map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-surface-overlay flex items-center justify-center text-xs text-text-muted shrink-0">
                {c.order}
              </span>
              <select
                value={c.field}
                onChange={(e) =>
                  updateCriteria(i, {
                    field: e.target.value as StandingsConfig['criteria'][number]['field'],
                  })
                }
                className="flex-1 h-9 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                {FIELDS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <select
                value={c.direction}
                onChange={(e) =>
                  updateCriteria(i, { direction: e.target.value as 'ASC' | 'DESC' })
                }
                className="w-28 h-9 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
              >
                <option value="DESC">Highest first</option>
                <option value="ASC">Lowest first</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-text-primary mb-3">Points System</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumField
            label="Points for Win"
            value={standingsConfig.pointsForWin}
            min={0}
            onChange={(n) =>
              update({ standingsConfig: { ...standingsConfig, pointsForWin: n } })
            }
          />
          <NumField
            label="Points for Draw"
            value={standingsConfig.pointsForDraw}
            min={0}
            onChange={(n) =>
              update({ standingsConfig: { ...standingsConfig, pointsForDraw: n } })
            }
          />
          <NumField
            label="Points for Loss"
            value={standingsConfig.pointsForLoss}
            min={0}
            onChange={(n) =>
              update({ standingsConfig: { ...standingsConfig, pointsForLoss: n } })
            }
          />
        </div>
      </div>
    </div>
  )
}
