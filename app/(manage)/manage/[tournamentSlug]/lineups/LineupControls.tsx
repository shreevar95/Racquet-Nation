'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Unlock, Lock } from 'lucide-react'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { cn } from '@/lib/utils'
import { openLineupSubmission, lockLineups } from '@/actions/lineup'

interface Props {
  matchId: string
  status: string
  bothSubmitted: boolean
  allLocked: boolean
}

export function LineupControls({ matchId, status, bothSubmitted, allLocked }: Props) {
  const [isPending, startTransition] = useTransition()

  if (allLocked) return null

  function open() {
    startTransition(async () => {
      const result = await openLineupSubmission(matchId)
      if (!result.success) toast.error(result.error)
      else toast.success('Lineup submission opened')
    })
  }

  function lock() {
    startTransition(async () => {
      const result = await lockLineups({ matchId })
      if (!result.success) toast.error(result.error)
      else toast.success('Lineups locked and revealed')
    })
  }

  return (
    <div className="flex gap-2">
      {status === 'UPCOMING' && (
        <button type="button" onClick={open} disabled={isPending} className={cn(rnButtonVariants({ variant: 'secondary', size: 'sm' }))}>
          <Unlock size={14} /> {isPending ? 'Opening…' : 'Open for Submission'}
        </button>
      )}
      {status === 'OPEN_FOR_SUBMISSION' && bothSubmitted && (
        <button type="button" onClick={lock} disabled={isPending} className={cn(rnButtonVariants({ variant: 'primary', size: 'sm' }))}>
          <Lock size={14} /> {isPending ? 'Locking…' : 'Lock Lineups'}
        </button>
      )}
      {status === 'OPEN_FOR_SUBMISSION' && !bothSubmitted && (
        <p className="self-center text-xs text-rn-text-muted">
          Waiting for both teams to submit…
        </p>
      )}
    </div>
  )
}
