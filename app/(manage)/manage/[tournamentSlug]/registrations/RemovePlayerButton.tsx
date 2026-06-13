'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { removePlayerFromTournament } from '@/actions/registration'

export function RemovePlayerButton({
  registrationId,
  playerName,
}: {
  registrationId: string
  playerName: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    if (!window.confirm(`Move ${playerName} to the waitlist? They will be removed from their team and their spot given to the next waitlisted player.`)) return

    startTransition(async () => {
      const result = await removePlayerFromTournament(registrationId)
      if (result.success) {
        toast.success(`${playerName} moved to the waitlist.`)
      } else {
        toast.error(result.error ?? 'Something went wrong')
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleRemove}
      disabled={isPending}
      title="Move to waitlist"
      className="text-text-muted hover:text-red-400 hover:bg-red-500/10"
    >
      <UserMinus size={14} />
    </Button>
  )
}
