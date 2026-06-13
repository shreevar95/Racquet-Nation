'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { assignPlayerToTeam } from '@/actions/team'

interface Player {
  playerId: string
  name: string
  avatarUrl: string | null
}

interface Props {
  teamId: string
  approvedPlayers: Player[]
}

export function AssignPlayerForm({ teamId, approvedPlayers }: Props) {
  const [open, setOpen] = useState(false)
  const [playerId, setPlayerId] = useState('')
  const [role, setRole] = useState<'PLAYER' | 'CAPTAIN'>('PLAYER')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!playerId) return
    startTransition(async () => {
      const result = await assignPlayerToTeam({ teamId, playerId, role })
      if (result.success) {
        toast.success('Player assigned')
        setPlayerId('')
        setOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 transition-colors"
      >
        <UserPlus size={12} /> Assign player
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 flex-wrap">
      <select
        value={playerId}
        onChange={(e) => setPlayerId(e.target.value)}
        required
        className="h-9 flex-1 min-w-40 rounded-md border border-border bg-surface px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
      >
        <option value="">Select player...</option>
        {approvedPlayers.map((p) => (
          <option key={p.playerId} value={p.playerId}>{p.name}</option>
        ))}
      </select>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as 'PLAYER' | 'CAPTAIN')}
        className="h-9 w-28 rounded-md border border-border bg-surface px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
      >
        <option value="PLAYER">Player</option>
        <option value="CAPTAIN">Captain</option>
      </select>
      <Button type="submit" size="sm" loading={isPending}>Add</Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
    </form>
  )
}
