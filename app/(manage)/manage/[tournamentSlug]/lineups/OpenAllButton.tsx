'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { openAllMatchesForLineup } from '@/actions/lineup'

interface Props {
  tournamentId: string
  upcomingCount: number
}

export function OpenAllButton({ tournamentId, upcomingCount }: Props) {
  const [isPending, startTransition] = useTransition()

  if (upcomingCount === 0) return null

  function handleOpen() {
    startTransition(async () => {
      const result = await openAllMatchesForLineup(tournamentId)
      if (result.success) {
        toast.success(`Opened ${result.count} match${result.count === 1 ? '' : 'es'} for lineup submission`)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={handleOpen} loading={isPending}>
      <Unlock size={14} /> Open All for Submission
    </Button>
  )
}
