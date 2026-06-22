'use client'

import { useState, useTransition } from 'react'
import { Palette, X, Check } from 'lucide-react'
import { toast } from 'sonner'
import { TeamAvatarPicker } from '@/components/admin/TeamAvatarPicker'
import { updateTeamAvatar } from '@/actions/team'

interface Props {
  teamId: string
  teamName: string
  currentLogoUrl: string | null
  currentColor: string | null
}

export function EditTeamAvatarButton({ teamId, teamName, currentLogoUrl, currentColor }: Props) {
  const [open, setOpen] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(currentLogoUrl)
  const [primaryColor, setPrimaryColor] = useState<string | null>(currentColor)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await updateTeamAvatar(teamId, { logoUrl, primaryColor })
      if (result.success) {
        toast.success('Avatar updated')
        setOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-text-muted hover:text-brand-400 transition-colors"
        title="Edit avatar"
      >
        <Palette size={13} />
      </button>
    )
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-surface-overlay p-3 space-y-3">
      <TeamAvatarPicker
        teamName={teamName}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        onLogoUrlChange={setLogoUrl}
        onColorChange={setPrimaryColor}
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-1 text-xs text-success hover:text-success/80 disabled:opacity-50"
        >
          <Check size={12} /> Save
        </button>
        <button
          onClick={() => { setOpen(false); setLogoUrl(currentLogoUrl); setPrimaryColor(currentColor) }}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary"
        >
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  )
}
