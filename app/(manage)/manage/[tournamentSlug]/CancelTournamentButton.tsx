'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { cancelTournament } from '@/actions/tournament'

interface Props {
  tournamentId: string
  tournamentName: string
}

export function CancelTournamentButton({ tournamentId, tournamentName }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    if (
      !window.confirm(
        `Cancel "${tournamentName}"?\n\nThis will remove it from the public listings. You cannot undo this from the app.`,
      )
    ) {
      return
    }

    startTransition(async () => {
      const result = await cancelTournament(tournamentId)
      if (result.success) {
        toast.success('Tournament cancelled.')
      } else {
        toast.error(result.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <button
      onClick={handleCancel}
      disabled={isPending}
      className="text-xs text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
    >
      {isPending ? 'Cancelling…' : 'Cancel tournament'}
    </button>
  )
}
