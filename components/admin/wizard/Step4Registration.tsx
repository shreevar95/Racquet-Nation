'use client'

import type { CreateTournamentInput } from '@/types/tournament'

interface Props {
  data: CreateTournamentInput
  update: (patch: Partial<CreateTournamentInput>) => void
  onNext: () => void
}

const TOGGLES = [
  { key: 'requirePhone', label: 'Require phone number' },
  { key: 'requireDateOfBirth', label: 'Require date of birth' },
  { key: 'requireGender', label: 'Require gender' },
  { key: 'requireRating', label: 'Require self-rating' },
] as const

export function Step4Registration({ data, update }: Props) {
  const { registrationConfig } = data

  function toggle(key: (typeof TOGGLES)[number]['key']) {
    update({
      registrationConfig: {
        ...registrationConfig,
        [key]: !registrationConfig[key],
      },
    })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-text-primary">Required Fields</p>
        <p className="text-xs text-text-muted">
          These fields will be mandatory on the player registration form.
        </p>
        {TOGGLES.map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between cursor-pointer py-2 border-b border-border last:border-0">
            <span className="text-sm text-text-secondary">{label}</span>
            <input
              type="checkbox"
              checked={registrationConfig[key]}
              onChange={() => toggle(key)}
              className="w-4 h-4 rounded border-border accent-brand-500"
            />
          </label>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-text-primary">Registration Capacity</p>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">
            Max registrations (leave blank for unlimited)
          </label>
          <input
            type="number"
            min={1}
            value={registrationConfig.maxRegistrations ?? ''}
            onChange={(e) =>
              update({
                registrationConfig: {
                  ...registrationConfig,
                  maxRegistrations: e.target.value ? parseInt(e.target.value) : undefined,
                },
              })
            }
            placeholder={`${data.numTeams * data.playersPerTeam}`}
            className="h-10 w-40 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-lg bg-surface border border-dashed border-border/50 p-4 text-center">
        <p className="text-sm text-text-muted">
          Custom registration fields coming soon.
        </p>
      </div>
    </div>
  )
}
