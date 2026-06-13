'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Shuffle } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <Button variant="outline" size="sm" onClick={handleGenerate} loading={isPending}>
      <Shuffle size={14} /> Generate Round-Robin
    </Button>
  )
}
