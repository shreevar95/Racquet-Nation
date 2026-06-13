import type { Metadata } from 'next'
import { requireAuth } from '@/lib/auth'
import { ProfileEditForm } from './ProfileEditForm'

export const metadata: Metadata = { title: 'My Profile' }

export default async function ProfilePage() {
  const user = await requireAuth()

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Profile</h1>
        <p className="text-text-secondary text-sm mt-1">
          Update your player information visible to tournament organizers.
        </p>
      </div>
      <ProfileEditForm user={user} />
    </div>
  )
}
