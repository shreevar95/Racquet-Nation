'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { rnButtonVariants } from '@/components/rn/RnButton'
import { cn } from '@/lib/utils'
import { updateProfile } from '@/actions/player'
import type { AuthUser } from '@/lib/auth'

interface Props {
  user: AuthUser
}

const fieldClassName =
  'h-11 w-full rounded-xl border border-rn-border bg-rn-card px-3.5 text-sm text-ink placeholder:text-rn-text-muted focus:border-saffron focus:outline-none focus:ring-2 focus:ring-saffron/20 transition-colors'

const labelClassName = 'text-[11px] font-extrabold uppercase tracking-[.08em] text-rn-text-muted'

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
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar + name header */}
      <RnCard className="flex items-center gap-4 p-5">
        <RnTeamTile name={user.name} logoUrl={user.avatarUrl} color="#19A463" size="xl" className="rounded-full" />
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-ink">{user.name}</p>
          {profile?.slug && (
            <p className="truncate text-xs text-rn-text-muted">racquetnation.com/players/{profile.slug}</p>
          )}
        </div>
      </RnCard>

      {/* Player details */}
      <RnCard className="p-5">
        <p className="mb-4 text-xs font-extrabold uppercase tracking-[.14em] text-saffron">Player Details</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className={labelClassName}>Full Name</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className={labelClassName}>Phone Number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dateOfBirth" className={labelClassName}>Date of Birth</label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={handleChange}
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="gender" className={labelClassName}>Gender</label>
            <select
              id="gender"
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className={fieldClassName}
            >
              <option value="">Prefer not to say</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="yearsPlaying" className={labelClassName}>Years Playing</label>
            <input
              id="yearsPlaying"
              name="yearsPlaying"
              type="number"
              min="0"
              max="50"
              value={form.yearsPlaying}
              onChange={handleChange}
              placeholder="3"
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="selfRating" className={labelClassName}>Self Rating (1.0 – 5.0)</label>
            <input
              id="selfRating"
              name="selfRating"
              type="number"
              min="1"
              max="5"
              step="0.5"
              value={form.selfRating}
              onChange={handleChange}
              placeholder="3.5"
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="location" className={labelClassName}>Location</label>
            <input
              id="location"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Mumbai, India"
              className={fieldClassName}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="bio" className={labelClassName}>Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              rows={3}
              maxLength={500}
              placeholder="Tell other players a bit about yourself..."
              className={cn(fieldClassName, 'h-auto resize-none py-2.5')}
            />
          </div>
        </div>
      </RnCard>

      {/* Emergency contact */}
      <RnCard className="p-5">
        <p className="mb-4 text-xs font-extrabold uppercase tracking-[.14em] text-saffron">Emergency Contact</p>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="emergencyContact" className={labelClassName}>Emergency Contact</label>
          <input
            id="emergencyContact"
            name="emergencyContact"
            value={form.emergencyContact}
            onChange={handleChange}
            placeholder="Name — Phone number"
            className={fieldClassName}
          />
        </div>
      </RnCard>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className={cn(rnButtonVariants({ variant: 'primary', size: 'lg' }))}
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
