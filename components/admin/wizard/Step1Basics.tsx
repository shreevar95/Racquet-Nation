'use client'

import { Input } from '@/components/ui/input'
import type { CreateTournamentInput } from '@/types/tournament'

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
      <Input
        label="Tournament Name"
        value={data.name}
        onChange={(e) => update({ name: e.target.value })}
        placeholder="Monsoon Pickleball League 2027"
        required
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">Sport</label>
        <select
          value={data.sportId}
          onChange={(e) => update({ sportId: e.target.value })}
          className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
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
        <Input
          label="Start Date"
          type="date"
          value={data.startDate}
          onChange={(e) => update({ startDate: e.target.value })}
          required
        />
        <Input
          label="Start Time (optional)"
          type="time"
          value={data.startTime ?? ''}
          onChange={(e) => update({ startTime: e.target.value || null })}
        />
        <Input
          label="End Date"
          type="date"
          value={data.endDate}
          onChange={(e) => update({ endDate: e.target.value })}
          required
        />
        <Input
          label="End Time (optional)"
          type="time"
          value={data.endTime ?? ''}
          onChange={(e) => update({ endTime: e.target.value || null })}
        />
      </div>

      <Input
        label="Venue"
        value={data.venue}
        onChange={(e) => update({ venue: e.target.value })}
        placeholder="DLF Sports Club, Gurugram"
        required
      />

      <Input
        label="Venue Address (optional)"
        value={data.venueAddress ?? ''}
        onChange={(e) => update({ venueAddress: e.target.value || null })}
        placeholder="Sector 42, DLF City Phase III, Gurugram 122002"
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary">Description (optional)</label>
        <textarea
          value={data.description ?? ''}
          onChange={(e) => update({ description: e.target.value || null })}
          rows={3}
          placeholder="Describe the tournament format, eligibility, prizes..."
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
        />
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary">Visibility</label>
        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={[
                'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                data.visibility === opt.value
                  ? 'border-brand-500/60 bg-brand-500/8'
                  : 'border-border hover:border-border bg-surface-raised hover:bg-surface-overlay',
              ].join(' ')}
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
                className="mt-0.5 accent-brand-500"
              />
              <div>
                <p className="text-sm font-semibold text-text-primary">{opt.label}</p>
                <p className="text-xs text-text-secondary mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Registration code — only shown for INVITE_ONLY */}
      {data.visibility === 'INVITE_ONLY' && (
        <Input
          label="Registration Code"
          value={data.registrationCode ?? ''}
          onChange={(e) => update({ registrationCode: e.target.value || null })}
          placeholder="e.g. RN2026AXIS"
          required
        />
      )}
    </div>
  )
}
