'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteTeam } from '@/actions/team'

export function DeleteTeamButton({
  teamId,
  teamName,
}: {
  teamId: string
  teamName: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm(`Delete "${teamName}"? This will remove all player assignments for this team.`)) return
    startTransition(async () => {
      const result = await deleteTeam(teamId)
      if (result.success) {
        toast.success(`${teamName} deleted`)
      } else {
        toast.error(result.error ?? 'Failed to delete team')
      }
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Delete team"
      className="text-text-muted hover:text-red-400 transition-colors disabled:opacity-50"
    >
      <Trash2 size={13} />
    </button>
  )
}
