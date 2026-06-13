'use client'

import { useState, useRef, useTransition } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { updateTeamName } from '@/actions/team'

export function EditTeamNameButton({
  teamId,
  currentName,
}: {
  teamId: string
  currentName: string
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(currentName)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setValue(currentName)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function cancel() {
    setEditing(false)
    setValue(currentName)
  }

  function save() {
    if (value.trim() === currentName) { setEditing(false); return }
    startTransition(async () => {
      const result = await updateTeamName(teamId, value)
      if (result.success) {
        toast.success('Team name updated')
        setEditing(false)
      } else {
        toast.error(result.error ?? 'Failed to update')
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') save()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 flex-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPending}
          autoFocus
          className="flex-1 text-sm font-semibold bg-surface border border-brand-500 rounded px-2 py-0.5 text-text-primary outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          onClick={save}
          disabled={isPending}
          className="text-success hover:text-success/80 disabled:opacity-50"
          title="Save"
        >
          <Check size={14} />
        </button>
        <button
          onClick={cancel}
          disabled={isPending}
          className="text-text-muted hover:text-text-secondary"
          title="Cancel"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={startEdit}
      className="text-text-muted hover:text-brand-400 transition-colors"
      title="Edit team name"
    >
      <Pencil size={13} />
    </button>
  )
}
