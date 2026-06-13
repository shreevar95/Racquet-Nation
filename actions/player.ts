'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UpdateProfileSchema, type UpdateProfileInput } from '@/types/player'

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = UpdateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const user = await requireAuth()
  const { name, phone, dateOfBirth, gender, yearsPlaying, selfRating, bio, location, emergencyContact } =
    parsed.data

  await Promise.all([
    prisma.user.update({
      where: { id: user.id },
      data: { name, phone },
    }),
    user.playerProfile
      ? prisma.playerProfile.update({
          where: { id: user.playerProfile.id },
          data: {
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            gender: gender ?? null,
            yearsPlaying: yearsPlaying ?? null,
            selfRating: selfRating ?? null,
            bio: bio ?? null,
            location: location ?? null,
            emergencyContact: emergencyContact ?? null,
          },
        })
      : null,
  ])

  revalidatePath('/profile')
  if (user.playerProfile?.slug) {
    revalidatePath(`/players/${user.playerProfile.slug}`)
  }

  return { success: true }
}
