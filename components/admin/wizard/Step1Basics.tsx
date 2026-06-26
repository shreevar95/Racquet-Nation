'use client'

import type { CreateTournamentInput } from '@/types/tournament'
import { rnFieldClassName, rnLabelClassName } from './rnWizardStyles'
import { cn } from '@/lib/utils'

interface Props {
  data: CreateTournamentInput
  update: (patch: Partial<CreateTournamentInput>) => void
  onNext: () => void
  sports: { id: string; name: string; slug: string }[]
}

const VISIBILITY_OPTIONS = [
  {
    value: 'PUBLIC',
    label: 'Public',
    description: 'Listed on the browse page. Anyone can register.',
  },
  {
    value: 'UNLISTED',
    label: 'Unlisted',
    description: 'Not listed publicly. Accessible only via direct link.',
  },
  {
    value: 'INVITE_ONLY',
    label: 'Invite Only',
    description: 'Requires a registration code. Share the code with invited players.',
  },
]

export function Step1Basics({ data, update, sports }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className={rnLabelClassName}>Tournament Name</label>
        <input
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder="Monsoon Pickleball League 2027"
          required
          className={rnFieldClassName}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={rnLabelClassName}>Sport</label>
        <select
          value={data.sportId}
          onChange={(e) => update({ sportId: e.target.value })}
          className={rnFieldClassName}
        >
          <option value="">Select a sport...</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Dates + Times */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={rnLabelClassName}>Start Date</label>
          <input
            type="date"
            value={data.startDate}
            onChange={(e) => update({ startDate: e.target.value })}
            required
            className={rnFieldClassName}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={rnLabelClassName}>Start Time (optional)</label>
          <input
            type="time"
            value={data.startTime ?? ''}
            onChange={(e) => update({ startTime: e.target.value || null })}
            className={rnFieldClassName}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={rnLabelClassName}>End Date</label>
          <input
            type="date"
            value={data.endDate}
            onChange={(e) => update({ endDate: e.target.value })}
            required
            className={rnFieldClassName}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={rnLabelClassName}>End Time (optional)</label>
          <input
            type="time"
            value={data.endTime ?? ''}
            onChange={(e) => update({ endTime: e.target.value || null })}
            className={rnFieldClassName}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={rnLabelClassName}>Venue</label>
        <input
          value={data.venue}
          onChange={(e) => update({ venue: e.target.value })}
          placeholder="DLF Sports Club, Gurugram"
          required
          className={rnFieldClassName}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={rnLabelClassName}>Venue Address (optional)</label>
        <input
          value={data.venueAddress ?? ''}
          onChange={(e) => update({ venueAddress: e.target.value || null })}
          placeholder="Sector 42, DLF City Phase III, Gurugram 122002"
          className={rnFieldClassName}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={rnLabelClassName}>Description (optional)</label>
        <textarea
          value={data.description ?? ''}
          onChange={(e) => update({ description: e.target.value || null })}
          rows={3}
          placeholder="Describe the tournament format, eligibility, prizes..."
          className={cn(rnFieldClassName, 'h-auto resize-none py-2')}
        />
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <label className={rnLabelClassName}>Visibility</label>
        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                data.visibility === opt.value
                  ? 'border-saffron bg-saffron-tint'
                  : 'border-rn-border bg-rn-card hover:border-saffron/50',
              )}
            >
              <input
                type="radio"
                name="visibility"
                value={opt.value}
                checked={data.visibility === opt.value}
                onChange={() => update({
                  visibility: opt.value as 'PUBLIC' | 'UNLISTED' | 'INVITE_ONLY',
                  registrationCode: opt.value !== 'INVITE_ONLY' ? null : data.registrationCode,
                })}
                className="mt-0.5 accent-saffron"
              />
              <div>
                <p className="text-sm font-bold text-ink">{opt.label}</p>
                <p className="mt-0.5 text-xs text-rn-text-secondary">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Registration code — only shown for INVITE_ONLY */}
      {data.visibility === 'INVITE_ONLY' && (
        <div className="flex flex-col gap-1.5">
          <label className={rnLabelClassName}>Registration Code</label>
          <input
            value={data.registrationCode ?? ''}
            onChange={(e) => update({ registrationCode: e.target.value || null })}
            placeholder="e.g. RN2026AXIS"
            required
            className={rnFieldClassName}
          />
        </div>
      )}
    </div>
  )
}
