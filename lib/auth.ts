import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { User, PlayerProfile } from '@prisma/client'

export type AuthUser = User & { playerProfile: PlayerProfile | null }

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { userId } = await auth()
  if (!userId) return null

  return prisma.user.findUnique({
    where: { clerkId: userId },
    include: { playerProfile: true },
  })
}

export async function requireAuth(): Promise<AuthUser> {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Lazy upsert: create DB record if webhook delivery failed
  const clerkUser = await currentUser()
  if (!clerkUser) redirect('/sign-in')

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: {
      name: (`${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || clerkUser.emailAddresses[0]?.emailAddress) ?? 'User',
      email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
      avatarUrl: clerkUser.imageUrl ?? null,
    },
    create: {
      clerkId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
      name: (`${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || clerkUser.emailAddresses[0]?.emailAddress) ?? 'User',
      avatarUrl: clerkUser.imageUrl ?? null,
      playerProfile: {
        create: {
          slug: await generatePlayerSlug(
            `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || 'player',
            userId,
          ),
        },
      },
    },
    include: { playerProfile: true },
  })

  return user
}

export async function requirePlatformAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.platformRole !== 'PLATFORM_ADMIN') {
    redirect('/dashboard')
  }
  return user
}

// Imported here to avoid circular dep — slug helpers live in lib/slug.ts
// but auth.ts needs a player slug on lazy creation.
async function generatePlayerSlug(name: string, clerkId: string): Promise<string> {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') || 'player'

  const suffix = clerkId.slice(-4)
  const slug = `${base}-${suffix}`

  const existing = await prisma.playerProfile.findUnique({ where: { slug } })
  if (!existing) return slug
  return `${base}-${clerkId.slice(-8)}`
}
