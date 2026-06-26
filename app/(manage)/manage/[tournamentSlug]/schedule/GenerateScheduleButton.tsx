'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Shuffle } from 'lucide-react'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { generateRoundRobinSchedule } from '@/actions/match'

interface Props {
  tournamentId: string
  groupId: string
  groupName: string
}

export function GenerateScheduleButton({ tournamentId, groupId, groupName }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateRoundRobinSchedule({ tournamentId, groupId })
      if (result.success) {
        toast.success(`Generated ${result.matchCount} matches for ${groupName}`)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <button type="button" onClick={handleGenerate} disabled={isPending} className={rnButtonVariants({ variant: 'secondary', size: 'sm' })}>
      <Shuffle size={14} /> {isPending ? 'Generating…' : 'Generate Round-Robin'}
    </button>
  )
}
