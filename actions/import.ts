'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { canManageTournament } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const RowSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional().nullable(),
  selfRating: z.coerce.number().min(1).max(5).optional().nullable(),
  location: z.string().optional().nullable(),
})

export type ImportRow = z.infer<typeof RowSchema>

export type ImportResult = {
  success: boolean
  imported: number
  alreadyRegistered: number
  errors: { row: number; email: string; reason: string }[]
  error?: string
}

export async function importPlayersFromExcel(
  tournamentId: string,
  rows: ImportRow[],
): Promise<ImportResult> {
  const user = await requireAuth()
  if (!(await canManageTournament(user.id, tournamentId))) {
    return { success: false, imported: 0, alreadyRegistered: 0, errors: [], error: 'Not authorized' }
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { slug: true, maxPlayers: true },
  })
  if (!tournament) {
    return { success: false, imported: 0, alreadyRegistered: 0, errors: [], error: 'Tournament not found' }
  }

  let imported = 0
  let alreadyRegistered = 0
  const errors: ImportResult['errors'] = []

  for (let i = 0; i < rows.length; i++) {
    const parsed = RowSchema.safeParse(rows[i])
    if (!parsed.success) {
      errors.push({ row: i + 1, email: rows[i]?.email ?? '—', reason: parsed.error.issues[0]?.message ?? 'Invalid data' })
      continue
    }

    const row = parsed.data
    const email = row.email.toLowerCase().trim()

    try {
      // Get or create the user
      let dbUser = await prisma.user.findUnique({
        where: { email },
        include: { playerProfile: true },
      })

      if (!dbUser) {
        // Create imported user (no clerkId — will be claimed when they sign up)
        const baseSlug = email.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase()
        const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`
        dbUser = await prisma.user.create({
          data: {
            email,
            name: row.name,
            phone: row.phone ?? null,
            isImported: true,
            playerProfile: {
              create: {
                slug,
                dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
                gender: row.gender ?? null,
                selfRating: row.selfRating ?? null,
                location: row.location ?? null,
              },
            },
          },
          include: { playerProfile: true },
        })
      } else if (!dbUser.playerProfile) {
        // User exists via Clerk but has no profile yet — create one
        const baseSlug = email.split('@')[0].replace(/[^a-z0-9]/gi, '-').toLowerCase()
        const slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`
        await prisma.playerProfile.create({
          data: {
            userId: dbUser.id,
            slug,
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
            gender: row.gender ?? null,
            selfRating: row.selfRating ?? null,
            location: row.location ?? null,
          },
        })
        dbUser = await prisma.user.findUnique({ where: { email }, include: { playerProfile: true } })
      }

      const userWithProfile = dbUser
      if (!userWithProfile?.playerProfile) {
        errors.push({ row: i + 1, email, reason: 'Could not create player profile' })
        continue
      }

      const playerId = userWithProfile.playerProfile.id

      // Check for existing registration
      const existing = await prisma.registration.findUnique({
        where: { tournamentId_playerId: { tournamentId, playerId } },
      })
      if (existing) {
        alreadyRegistered++
        continue
      }

      // Determine status (auto-accept up to capacity)
      const approvedCount = await prisma.registration.count({
        where: { tournamentId, status: 'APPROVED' },
      })
      const status = approvedCount < tournament.maxPlayers ? 'APPROVED' : 'WAITLISTED'

      await prisma.registration.create({
        data: {
          tournamentId,
          playerId,
          status,
          formData: {},
        },
      })

      imported++
    } catch (err) {
      errors.push({ row: i + 1, email, reason: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  revalidatePath(`/manage/${tournament.slug}/registrations`)
  return { success: true, imported, alreadyRegistered, errors }
}
