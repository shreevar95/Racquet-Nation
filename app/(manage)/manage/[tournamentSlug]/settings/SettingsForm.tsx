'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateTournamentSettings } from '@/actions/tournament'

interface Props {
  tournament: {
    id: string
    name: string
    venue: string
    venueAddress: string | null
    description: string | null
    rules: string | null
  }
}

export function SettingsForm({ tournament }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(tournament.name)
  const [venue, setVenue] = useState(tournament.venue)
  const [venueAddress, setVenueAddress] = useState(tournament.venueAddress ?? '')
  const [description, setDescription] = useState(tournament.description ?? '')
  const [rules, setRules] = useState(tournament.rules ?? '')

  function handleSubmit() {
    if (!name.trim()) { toast.error('Name is required'); return }
    if (!venue.trim()) { toast.error('Venue is required'); return }
    startTransition(async () => {
      const result = await updateTournamentSettings(tournament.id, {
        name: name.trim(),
        venue: venue.trim(),
        venueAddress: venueAddress.trim() || null,
        description: description.trim() || null,
        rules: rules.trim() || null,
      })
      if (result.success) {
        toast.success('Settings saved')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to save')
      }
    })
  }

  return (
    <div className="space-y-8 max-w-xl">
      <section className="space-y-4">
        <SectionHeader label="Basic Info" />
        <Input
          label="Tournament Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Axis Bank Championship 2026"
        />
        <Input
          label="Venue"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          placeholder="e.g. City Sports Complex"
        />
        <Input
          label="Venue Address (optional)"
          value={venueAddress}
          onChange={(e) => setVenueAddress(e.target.value)}
          placeholder="Full address"
        />
      </section>

      <section className="space-y-3">
        <SectionHeader label="About" />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="A brief description shown on the public tournament page"
            className="rounded-md border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none resize-none"
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader label="Rules" />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Tournament Rules</label>
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={12}
            placeholder={`Enter rules here. Markdown supported.\n\n## Format\n- Best of 4 games\n- Game to 11 points\n\n## Code of Conduct\n...`}
            className="rounded-md border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none resize-y font-mono"
          />
          <p className="text-xs text-text-muted">Markdown is supported — displayed on the public Rules tab.</p>
        </div>
      </section>

      <Button onClick={handleSubmit} loading={isPending} className="w-full" size="lg">
        <Save size={16} />
        Save Changes
      </Button>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-0.5 w-4 bg-brand-500" />
      <p className="text-brand-500 text-xs font-bold tracking-[0.15em] uppercase font-display">{label}</p>
    </div>
  )
}
