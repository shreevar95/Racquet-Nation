'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { updateProfile } from '@/actions/player'
import type { AuthUser } from '@/lib/auth'

interface Props {
  user: AuthUser
}

export function ProfileEditForm({ user }: Props) {
  const profile = user.playerProfile
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone ?? '',
    dateOfBirth: profile?.dateOfBirth
      ? new Date(profile.dateOfBirth).toISOString().split('T')[0]
      : '',
    gender: (profile?.gender ?? '') as string,
    yearsPlaying: profile?.yearsPlaying?.toString() ?? '',
    selfRating: profile?.selfRating?.toString() ?? '',
    bio: profile?.bio ?? '',
    location: profile?.location ?? '',
    emergencyContact: profile?.emergencyContact ?? '',
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateProfile({
        name: form.name,
        phone: form.phone || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: (form.gender as 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY') || null,
        yearsPlaying: form.yearsPlaying ? parseInt(form.yearsPlaying) : null,
        selfRating: form.selfRating ? parseFloat(form.selfRating) : null,
        bio: form.bio || null,
        location: form.location || null,
        emergencyContact: form.emergencyContact || null,
      })
      if (result.success) {
        toast.success('Profile updated')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Avatar + name header */}
      <div className="flex items-center gap-4">
        <Avatar src={user.avatarUrl} name={user.name} size="xl" />
        <div>
          <p className="font-semibold text-text-primary">{user.name}</p>
          {profile?.slug && (
            <p className="text-xs text-text-muted">racquetnation.com/players/{profile.slug}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <Input
          label="Phone Number"
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="+91 98765 43210"
        />
        <Input
          label="Date of Birth"
          name="dateOfBirth"
          type="date"
          value={form.dateOfBirth}
          onChange={handleChange}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Gender</label>
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Prefer not to say</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <Input
          label="Years Playing"
          name="yearsPlaying"
          type="number"
          min="0"
          max="50"
          value={form.yearsPlaying}
          onChange={handleChange}
          placeholder="3"
        />
        <Input
          label="Self Rating (1.0 – 5.0)"
          name="selfRating"
          type="number"
          min="1"
          max="5"
          step="0.5"
          value={form.selfRating}
          onChange={handleChange}
          placeholder="3.5"
        />
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Location</label>
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Mumbai, India"
            className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
        <div className="sm:col-span-2 flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Bio</label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={3}
            maxLength={500}
            placeholder="Tell other players a bit about yourself..."
            className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Emergency Contact"
            name="emergencyContact"
            value={form.emergencyContact}
            onChange={handleChange}
            placeholder="Name — Phone number"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={isPending}>
          Save Changes
        </Button>
      </div>
    </form>
  )
}
