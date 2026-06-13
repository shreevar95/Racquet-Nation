'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import type { CreateTournamentInput } from '@/types/tournament'

interface Props {
  data: CreateTournamentInput
  update: (patch: Partial<CreateTournamentInput>) => void
  onNext: () => void
}

interface NumFieldProps {
  label: string
  value: number
  min: number
  max: number
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
        if (!isNaN(n) && n >= min && n <= max) onChange(n)
      }}
      onBlur={() => {
        const n = parseInt(raw)
        const clamped = isNaN(n) ? min : Math.max(min, Math.min(max, n))
        setRaw(String(clamped))
        onChange(clamped)
      }}
    />
  )
}

export function Step2Structure({ data, update }: Props) {
  const maxPlayers = data.numTeams * data.playersPerTeam
  const teamsPerGroup = Math.ceil(data.numTeams / data.numGroups)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <NumField
          label="Number of Teams"
          value={data.numTeams}
          min={2}
          max={64}
          onChange={(n) => update({ numTeams: n })}
        />
        <NumField
          label="Players per Team"
          value={data.playersPerTeam}
          min={1}
          max={20}
          onChange={(n) => update({ playersPerTeam: n })}
        />
        <NumField
          label="Number of Groups"
          value={data.numGroups}
          min={1}
          max={16}
          onChange={(n) => update({ numGroups: n })}
        />
      </div>

      <div className="rounded-lg bg-surface border border-border p-4 space-y-2">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Structure Preview</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-text-secondary">Total players</span>
          <span className="text-text-primary font-medium">{maxPlayers}</span>
          <span className="text-text-secondary">Teams per group</span>
          <span className="text-text-primary font-medium">~{teamsPerGroup}</span>
          <span className="text-text-secondary">Matches per group (RR)</span>
          <span className="text-text-primary font-medium">
            {(teamsPerGroup * (teamsPerGroup - 1)) / 2}
          </span>
        </div>
      </div>

      <p className="text-xs text-text-muted">
        Groups are auto-generated (Group A, Group B…). Teams are assigned to groups after
        registration closes.
      </p>
    </div>
  )
}
