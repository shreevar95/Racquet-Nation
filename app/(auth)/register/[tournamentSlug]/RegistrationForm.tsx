'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { applyToTournament } from '@/actions/registration'
import type { AuthUser } from '@/lib/auth'

interface Props {
  tournamentId: string
  registrationConfig: Record<string, unknown>
  user: AuthUser
  requiresCode?: boolean
}

export function RegistrationForm({ tournamentId, registrationConfig, user, requiresCode }: Props) {
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState<'APPROVED' | 'WAITLISTED' | null>(null)

  const config = registrationConfig as {
    requirePhone?: boolean
    requireDateOfBirth?: boolean
    requireGender?: boolean
    requireRating?: boolean
  }

  const profile = user.playerProfile

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const formData: Record<string, string> = {}
    fd.forEach((v, k) => { formData[k] = v.toString() })

    startTransition(async () => {
      const result = await applyToTournament({
        tournamentId,
        formData,
        registrationCode: formData['registrationCode'],
      })
      if (result.success) {
        setSubmitted(result.status ?? 'APPROVED')
        toast.success(result.status === 'APPROVED' ? 'You\'re in!' : 'Added to waitlist')
      } else {
        toast.error(result.error ?? 'Something went wrong')
      }
    })
  }

  if (submitted) {
    const approved = submitted === 'APPROVED'
    return (
      <div className={[
        'rounded-lg border p-6 text-center space-y-2',
        approved ? 'border-success/30 bg-success-bg' : 'border-warning/30 bg-warning-bg',
      ].join(' ')}>
        <p className={['font-display font-bold text-lg uppercase', approved ? 'text-success' : 'text-warning'].join(' ')}>
          {approved ? "You're Registered!" : 'Added to Waitlist'}
        </p>
        <p className="text-sm text-text-secondary">
          {approved
            ? 'Your spot is confirmed. Check the tournament page for schedule updates.'
            : "The tournament is currently full. You'll be notified if a spot opens up."}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Pre-filled from profile */}
      <div className="rounded-lg bg-surface-raised border border-border p-4 space-y-1">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Your Profile</p>
        <p className="text-sm text-text-primary">{user.name}</p>
        <p className="text-xs text-text-secondary">{user.email}</p>
      </div>

      {requiresCode && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Registration Code *</label>
          <input
            name="registrationCode"
            type="text"
            required
            placeholder="Enter your invite code"
            className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none font-mono tracking-widest uppercase"
          />
        </div>
      )}

      {config.requirePhone && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Phone Number *</label>
          <input
            name="phone"
            type="tel"
            required
            defaultValue={user.phone ?? ''}
            className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          />
        </div>
      )}

      {config.requireDateOfBirth && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Date of Birth *</label>
          <input
            name="dateOfBirth"
            type="date"
            required
            defaultValue={
              profile?.dateOfBirth
                ? new Date(profile.dateOfBirth).toISOString().split('T')[0]
                : ''
            }
            className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          />
        </div>
      )}

      {config.requireGender && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Gender *</label>
          <select
            name="gender"
            required
            defaultValue={profile?.gender ?? ''}
            className="h-10 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          >
            <option value="">Select...</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      )}

      {config.requireRating && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text-secondary">Self Rating (1.0–5.0) *</label>
          <input
            name="selfRating"
            type="number"
            min="1"
            max="5"
            step="0.5"
            required
            defaultValue={profile?.selfRating?.toString() ?? ''}
            className="h-10 w-32 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-primary focus:border-brand-500 focus:outline-none"
          />
        </div>
      )}

      <Button type="submit" loading={isPending} className="w-full">
        Submit Application
      </Button>
    </form>
  )
}
