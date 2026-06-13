'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Crown } from 'lucide-react'
import { setTeamCaptain } from '@/actions/team'

interface Props {
  teamId: string
  playerId: string
  isCaptain: boolean
}

export function SetCaptainButton({ teamId, playerId, isCaptain }: Props) {
  const [isPending, startTransition] = useTransition()

  if (isCaptain) {
    return (
      <span title="Captain" className="text-brand-500 flex items-center">
        <Crown size={13} fill="currentColor" />
      </span>
    )
  }

  function handleClick() {
    startTransition(async () => {
      const result = await setTeamCaptain(teamId, playerId)
      if (!result.success) toast.error(result.error ?? 'Failed to set captain')
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title="Make captain"
      className="text-text-muted hover:text-brand-500 transition-colors disabled:opacity-40 flex items-center"
    >
      <Crown size={13} />
    </button>
  )
}
