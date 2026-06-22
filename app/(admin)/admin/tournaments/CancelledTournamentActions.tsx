'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { deleteTournament, reviveTournament } from '@/actions/tournament'

interface Props {
  tournamentId: string
  tournamentName: string
}

export function CancelledTournamentActions({ tournamentId, tournamentName }: Props) {
  const [isPendingRevive, startRevive] = useTransition()
  const [isPendingDelete, startDelete] = useTransition()

  function handleRevive() {
    startRevive(async () => {
      const result = await reviveTournament(tournamentId)
      if (result.success) {
        toast.success('Tournament restored to Draft')
      } else {
        toast.error(result.error)
      }
    })
  }

  function handleDelete() {
    if (!window.confirm(`Permanently delete "${tournamentName}"?\n\nThis cannot be undone. All matches, teams, and registrations will be deleted.`)) return
    startDelete(async () => {
      await deleteTournament(tournamentId)
    })
  }

  return (
    <div className="flex items-center gap-3" onClick={(e) => e.preventDefault()}>
      <button
        onClick={handleRevive}
        disabled={isPendingRevive || isPendingDelete}
        className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors disabled:opacity-50"
      >
        {isPendingRevive ? 'Restoring…' : 'Revive'}
      </button>
      <button
        onClick={handleDelete}
        disabled={isPendingRevive || isPendingDelete}
        className="text-xs font-semibold text-red-500 hover:text-red-400 transition-colors disabled:opacity-50"
      >
        {isPendingDelete ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  )
}
