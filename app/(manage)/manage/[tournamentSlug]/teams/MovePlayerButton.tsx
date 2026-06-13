'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { movePlayerToTeam } from '@/actions/team'

interface OtherTeam {
  id: string
  name: string
}

export function MovePlayerButton({
  playerId,
  fromTeamId,
  otherTeams,
}: {
  playerId: string
  fromTeamId: string
  otherTeams: OtherTeam[]
}) {
  const [isPending, startTransition] = useTransition()

  if (otherTeams.length === 0) return null

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const toTeamId = e.target.value
    if (!toTeamId) return
    e.target.value = ''

    startTransition(async () => {
      const result = await movePlayerToTeam(playerId, fromTeamId, toTeamId)
      if (result.success) {
        toast.success('Player moved.')
      } else {
        toast.error(result.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <select
      onChange={handleChange}
      disabled={isPending}
      defaultValue=""
      className="text-xs rounded border border-border bg-surface px-1.5 py-0.5 text-text-muted hover:border-brand-500/50 focus:outline-none focus:border-brand-500 disabled:opacity-50 cursor-pointer"
    >
      <option value="" disabled>
        Move to…
      </option>
      {otherTeams.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  )
}
