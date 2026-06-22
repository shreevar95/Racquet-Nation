'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { generateFinalSchedule } from '@/actions/match'

interface Props {
  tournamentId: string
}

export function GenerateFinalButton({ tournamentId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateFinalSchedule(tournamentId)
      if (result.success) {
        toast.success(`Generated ${result.matchCount} final matches`)
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <Button variant="default" size="sm" onClick={handleGenerate} loading={isPending}>
      <Trophy size={14} /> Generate Final Schedule
    </Button>
  )
}
