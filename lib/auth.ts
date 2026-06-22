import { cache } from 'react'
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { User, PlayerProfile } from '@prisma/client'

export type AuthUser = User & { playerProfile: PlayerProfile | null }

// cache() deduplicates calls within a single request — layout + page both calling
// requireAuth() only hits Clerk and the DB once per render cycle.

export const getCurrentUser = cache(async function getCurrentUser(): Promise<AuthUser | null> {
  const { userId } = await auth()
  if (!userId) return null

  return prisma.user.findUnique({
    where: { clerkId: userId },
    include: { playerProfile: true },
  })
})

export const requireAuth = cache(async function requireAuth(): Promise<AuthUser> {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  // Lazy upsert: create DB record if Clerk webhook delivery failed
  const clerkUser = await currentUser()
  if (!clerkUser) redirect('/sign-in')

  const existing = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { playerProfile: true },
  })

  if (existing) {
    // Keep profile fields in sync with Clerk on every request
    return prisma.user.update({
      where: { clerkId: userId },
      data: {
        name:
          (`${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() ||
            clerkUser.emailAddresses[0]?.emailAddress) ?? 'User',
        email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
        avatarUrl: clerkUser.imageUrl ?? null,
      },
      include: { playerProfile: true },
    })
  }

  // First visit: generate slug then create user + player profile
  const slug = await generatePlayerSlug(
    `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || 'player',
    userId,
  )

  return prisma.user.create({
    data: {
      clerkId: userId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
      name:
        (`${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() ||
          clerkUser.emailAddresses[0]?.emailAddress) ?? 'User',
      avatarUrl: clerkUser.imageUrl ?? null,
      playerProfile: { create: { slug } },
    },
    include: { playerProfile: true },
  })
})

export const requirePlatformAdmin = cache(async function requirePlatformAdmin(): Promise<AuthUser> {
  const user = await requireAuth()
  if (user.platformRole !== 'PLATFORM_ADMIN') {
    redirect('/dashboard')
  }
  return user
})

// Duplicated here to avoid circular dep — slug helpers live in lib/slug.ts
// but auth.ts needs a player slug on first-visit user creation.
async function generatePlayerSlug(name: string, clerkId: string): Promise<string> {
  const base =
    name
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
