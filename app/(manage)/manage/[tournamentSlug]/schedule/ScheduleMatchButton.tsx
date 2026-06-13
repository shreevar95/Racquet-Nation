'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { scheduleMatch } from '@/actions/match'

// Convert a UTC ISO string to an IST datetime-local input value ("YYYY-MM-DDTHH:MM")
function utcToISTInputValue(utcIso: string): string {
  return new Date(utcIso)
    .toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' })
    .slice(0, 16)
}

// Convert a datetime-local value (treated as IST) to a UTC ISO string
function istInputToUTC(localValue: string): string {
  // Append IST offset so Date parses it correctly regardless of server/browser timezone
  return new Date(`${localValue}:00+05:30`).toISOString()
}

interface Props {
  matchId: string
  currentDate: string | null
  currentCourt: string | null | undefined
}

export function ScheduleMatchButton({ matchId, currentDate, currentCourt }: Props) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(
    currentDate ? utcToISTInputValue(currentDate) : '',
  )
  const [court, setCourt] = useState(currentCourt ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!date) return
    startTransition(async () => {
      const result = await scheduleMatch({ matchId, scheduledAt: istInputToUTC(date), court: court || null })
      if (result.success) {
        toast.success('Match scheduled')
        setOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (!open) {
    return (
      <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} title="Schedule">
        <Calendar size={14} />
      </Button>
    )
  }

  return (
    <form onSubmit={handleSave} className="flex items-end gap-2 flex-wrap">
      <input
        type="datetime-local"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
        className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
      />
      <input
        type="text"
        value={court}
        onChange={(e) => setCourt(e.target.value)}
        placeholder="Court"
        className="h-9 w-24 rounded-md border border-border bg-surface px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
      />
      <Button type="submit" size="sm" loading={isPending}>Save</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>✕</Button>
    </form>
  )
}
