'use client'

import type { CreateTournamentInput } from '@/types/tournament'
import { rnFieldClassName, rnLabelClassName } from './rnWizardStyles'
import { RnToggle } from '@/components/rn/RnToggle'

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
        <p className="text-sm font-bold text-ink">Required Fields</p>
        <p className="text-xs text-rn-text-muted">
          These fields will be mandatory on the player registration form.
        </p>
        {TOGGLES.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between border-b border-rn-border py-2 last:border-0">
            <span className="text-sm text-rn-text-secondary">{label}</span>
            <RnToggle checked={registrationConfig[key]} onChange={() => toggle(key)} />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-bold text-ink">Registration Capacity</p>
        <div className="flex flex-col gap-1.5">
          <label className={rnLabelClassName}>
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
            className={`${rnFieldClassName} w-40`}
          />
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-rn-border bg-paper p-4 text-center">
        <p className="text-sm text-rn-text-muted">
          Custom registration fields coming soon.
        </p>
      </div>
    </div>
  )
}
