'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Users } from 'lucide-react'
import { openMatchForLineup } from '@/actions/match'

interface Props {
  matchId: string
}

export function OpenForLineupButton({ matchId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    startTransition(async () => {
      const result = await openMatchForLineup(matchId)
      if (result.success) {
        toast.success('Match opened — captains can now submit lineups')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <button
      onClick={handleOpen}
      disabled={isPending}
      title="Open for lineup submission"
      className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 border border-brand-500/40 rounded px-2 py-0.5 transition-colors disabled:opacity-50"
    >
      <Users size={11} />
      {isPending ? '…' : 'Open Lineups'}
    </button>
  )
}
