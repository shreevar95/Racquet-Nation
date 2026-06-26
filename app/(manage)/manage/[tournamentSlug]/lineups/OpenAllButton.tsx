'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Unlock } from 'lucide-react'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { cn } from '@/lib/utils'
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
    <button type="button" onClick={handleOpen} disabled={isPending} className={cn(rnButtonVariants({ variant: 'secondary', size: 'sm' }))}>
      <Unlock size={14} /> {isPending ? 'Opening…' : 'Open All for Submission'}
    </button>
  )
}
