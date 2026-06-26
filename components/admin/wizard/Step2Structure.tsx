'use client'

import { useState, useEffect } from 'react'
import type { CreateTournamentInput } from '@/types/tournament'
import { rnFieldClassName, rnLabelClassName, rnOptionCardClassName } from './rnWizardStyles'
import { cn } from '@/lib/utils'

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
    <div className="flex flex-col gap-1.5">
      <label className={rnLabelClassName}>{label}</label>
      <input
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
        className={rnFieldClassName}
      />
    </div>
  )
}

const STRUCTURE_OPTIONS = [
  {
    value: 'GROUP_STAGE_ONLY',
    label: 'Group Stage Only',
    description: 'Round-robin within groups. No final stage.',
  },
  {
    value: 'GROUP_STAGE_PLUS_KNOCKOUT',
    label: 'Groups + Final Stage',
    description: 'Group stage followed by a final round.',
  },
  {
    value: 'KNOCKOUT_ONLY',
    label: 'Knockout Only',
    description: 'Pure knockout from the start. No group stage.',
  },
]

const KNOCKOUT_TYPE_OPTIONS = [
  {
    value: 'ROUND_ROBIN',
    label: 'Final Round Robin',
    description: 'Qualifying teams all play each other — best record wins.',
  },
  {
    value: 'BRACKET',
    label: 'Elimination Bracket',
    description: 'Single elimination — lose once and you\'re out.',
  },
]

export function Step2Structure({ data, update }: Props) {
  const maxPlayers = data.numTeams * data.playersPerTeam
  const teamsPerGroup = Math.ceil(data.numTeams / data.numGroups)
  const structure = data.matchFormat.tournamentStructure ?? 'GROUP_STAGE_ONLY'
  const hasGroups = structure !== 'KNOCKOUT_ONLY'
  const hasKnockout = structure !== 'GROUP_STAGE_ONLY'

  return (
    <div className="space-y-5">
      {/* Tournament structure */}
      <div>
        <p className="mb-3 text-sm font-bold text-ink">Tournament Format</p>
        <div className="grid gap-2">
          {STRUCTURE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                update({
                  matchFormat: {
                    ...data.matchFormat,
                    tournamentStructure: opt.value as 'GROUP_STAGE_ONLY' | 'KNOCKOUT_ONLY' | 'GROUP_STAGE_PLUS_KNOCKOUT',
                  },
                  numGroups: opt.value === 'KNOCKOUT_ONLY' ? 0 : Math.max(1, data.numGroups),
                })
              }
              className={rnOptionCardClassName(structure === opt.value)}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                  structure === opt.value ? 'border-saffron' : 'border-rn-border',
                )}
              >
                {structure === opt.value && <span className="h-2 w-2 rounded-full bg-saffron" />}
              </span>
              <div>
                <p className="text-sm font-bold text-ink">{opt.label}</p>
                <p className="mt-0.5 text-xs text-rn-text-secondary">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Team counts */}
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
        {hasGroups && (
          <NumField
            label="Number of Groups"
            value={data.numGroups}
            min={1}
            max={16}
            onChange={(n) => update({ numGroups: n })}
          />
        )}
        {hasKnockout && hasGroups && (
          <NumField
            label="Teams Advance Per Group"
            value={data.matchFormat.teamsAdvancePerGroup ?? 2}
            min={1}
            max={Math.max(1, teamsPerGroup - 1)}
            onChange={(n) =>
              update({ matchFormat: { ...data.matchFormat, teamsAdvancePerGroup: n } })
            }
          />
        )}
      </div>

      {/* Knockout type selector */}
      {hasKnockout && (
        <div>
          <p className="mb-3 text-sm font-bold text-ink">Final Stage Format</p>
          <div className="grid gap-2">
            {KNOCKOUT_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  update({ matchFormat: { ...data.matchFormat, knockoutType: opt.value as 'ROUND_ROBIN' | 'BRACKET' } })
                }
                className={rnOptionCardClassName((data.matchFormat.knockoutType ?? 'ROUND_ROBIN') === opt.value)}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                    (data.matchFormat.knockoutType ?? 'ROUND_ROBIN') === opt.value ? 'border-saffron' : 'border-rn-border',
                  )}
                >
                  {(data.matchFormat.knockoutType ?? 'ROUND_ROBIN') === opt.value && (
                    <span className="h-2 w-2 rounded-full bg-saffron" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-rn-text-secondary">{opt.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-rn-border bg-paper p-4">
        <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">Preview</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-rn-text-secondary">Total players</span>
          <span className="font-bold text-ink">{maxPlayers}</span>
          {hasGroups && (
            <>
              <span className="text-rn-text-secondary">Teams per group</span>
              <span className="font-bold text-ink">~{teamsPerGroup}</span>
              <span className="text-rn-text-secondary">Group matches (round-robin)</span>
              <span className="font-bold text-ink">
                {data.numGroups} × {(teamsPerGroup * (teamsPerGroup - 1)) / 2} ={' '}
                {data.numGroups * ((teamsPerGroup * (teamsPerGroup - 1)) / 2)}
              </span>
            </>
          )}
          {hasKnockout && (
            <>
              <span className="text-rn-text-secondary">Knockout entrants</span>
              <span className="font-bold text-ink">
                {hasGroups
                  ? data.numGroups * (data.matchFormat.teamsAdvancePerGroup ?? 2)
                  : data.numTeams}
              </span>
            </>
          )}
        </div>
      </div>

      {hasGroups && (
        <p className="text-xs text-rn-text-muted">
          Groups are auto-generated (Group A, Group B…). Teams are assigned after registration
          closes.
        </p>
      )}
    </div>
  )
}
