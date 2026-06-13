'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Unlock, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
        <Button variant="outline" size="sm" onClick={open} loading={isPending}>
          <Unlock size={14} /> Open for Submission
        </Button>
      )}
      {status === 'OPEN_FOR_SUBMISSION' && bothSubmitted && (
        <Button size="sm" onClick={lock} loading={isPending}>
          <Lock size={14} /> Lock Lineups
        </Button>
      )}
      {status === 'OPEN_FOR_SUBMISSION' && !bothSubmitted && (
        <p className="text-xs text-text-muted self-center">
          Waiting for both teams to submit…
        </p>
      )}
    </div>
  )
}
