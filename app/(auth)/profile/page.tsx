import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { RnPageHeader } from '@/components/rn/RnPageHeader'
import { ProfileEditForm } from './ProfileEditForm'

export const metadata: Metadata = { title: 'My Profile' }

export default async function ProfilePage() {
  const user = await requireAuth()

  return (
    <div className="min-h-screen bg-paper font-nunito text-ink">
      <RnPageHeader eyebrow="PLAYER" title="My Profile" />

      <div className="mx-auto max-w-2xl px-4 pb-6 pt-4">
        <p className="mb-4 text-sm text-rn-text-secondary">
          Update your player information visible to tournament organizers.
        </p>
        <ProfileEditForm user={user} />
      </div>
    </div>
  )
}
