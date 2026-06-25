import { cache } from 'react'
import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
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

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
  const name =
    (`${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || email) ?? 'User'
  const avatarUrl = clerkUser.imageUrl ?? null

  const existing = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { playerProfile: true },
  })

  let user: AuthUser

  if (existing) {
    // Keep profile fields in sync with Clerk on every request
    user = await prisma.user.update({
      where: { clerkId: userId },
      data: { name, email, avatarUrl },
      include: { playerProfile: true },
    })
  } else {
    // No row linked to this Clerk ID yet. It may still exist under this
    // email (e.g. a webhook race, or a pre-Clerk import) — reuse it
    // instead of colliding with the unique email constraint on create.
    const existingByEmail = email ? await prisma.user.findUnique({ where: { email } }) : null

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { clerkId: userId, name, email, avatarUrl },
        include: { playerProfile: true },
      })
    } else {
      const slug = await generatePlayerSlug(
        `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || 'player',
        userId,
      )

      try {
        user = await prisma.user.create({
          data: { clerkId: userId, email, name, avatarUrl, playerProfile: { create: { slug } } },
          include: { playerProfile: true },
        })
      } catch (err) {
        // Race: another concurrent request created this user between our
        // lookups above and this create call. Recover by re-fetching.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const recovered = await prisma.user.findUnique({
            where: { clerkId: userId },
            include: { playerProfile: true },
          })
          if (!recovered) throw err
          user = recovered
        } else {
          throw err
        }
      }
    }
  }

  // A user reused from a pre-existing row (matched by email) may not have
  // a player profile yet. upsert is safe here since userId is unique.
  if (!user.playerProfile) {
    const slug = await generatePlayerSlug(user.name || 'player', userId)
    const playerProfile = await prisma.playerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, slug },
    })
    user = { ...user, playerProfile }
  }

  return user
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
