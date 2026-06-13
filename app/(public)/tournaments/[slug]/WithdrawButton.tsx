'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { withdrawFromTournament } from '@/actions/registration'

export function WithdrawButton({ tournamentId }: { tournamentId: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handle() {
    if (!confirm('Are you sure you want to withdraw from this tournament? This cannot be undone.')) return
    startTransition(async () => {
      const result = await withdrawFromTournament(tournamentId)
      if (result.success) {
        toast.success('You have withdrawn from this tournament.')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Could not withdraw')
      }
    })
  }

  return (
    <button
      onClick={handle}
      disabled={isPending}
      className="text-xs text-error hover:text-error/80 transition-colors disabled:opacity-50"
    >
      {isPending ? 'Withdrawing…' : 'Withdraw'}
    </button>
  )
}
