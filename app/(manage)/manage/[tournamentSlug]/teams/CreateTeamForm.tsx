'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TeamAvatarPicker } from '@/components/admin/TeamAvatarPicker'
import { createTeam } from '@/actions/team'

interface Props {
  tournamentId: string
  groups: { id: string; name: string }[]
}

export function CreateTeamForm({ tournamentId, groups }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [groupId, setGroupId] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    startTransition(async () => {
      const result = await createTeam({
        tournamentId,
        name: name.trim(),
        groupId: groupId || null,
        logoUrl,
        primaryColor,
      })
      if (result.success) {
        toast.success('Team created')
        setName('')
        setGroupId('')
        setLogoUrl(null)
        setPrimaryColor(null)
        setOpen(false)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus size={14} /> New Team
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-surface-overlay p-4 space-y-4">
      <p className="text-sm font-semibold text-text-primary">New Team</p>
      <Input
        label="Team Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="The Falcons"
        required
        autoFocus
      />
      <TeamAvatarPicker
        teamName={name}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        onLogoUrlChange={setLogoUrl}
        onColorChange={setPrimaryColor}
      />
      {groups.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Group (optional)</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          >
            <option value="">Unassigned</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={isPending}>Create</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  )
}
