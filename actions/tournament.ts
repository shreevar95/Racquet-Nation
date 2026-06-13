'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { isPlatformAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { generateTournamentSlug } from '@/lib/slug'
import { CreateTournamentSchema, type CreateTournamentInput } from '@/types/tournament'

export async function createTournament(
  input: CreateTournamentInput,
): Promise<{ success: false; error: string } | never> {
  const user = await requireAuth()
  if (!(await isPlatformAdmin(user.id))) {
    return { success: false, error: 'Not authorized' }
  }

  const parsed = CreateTournamentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const data = parsed.data
  const slug = await generateTournamentSlug(data.name)

  const maxPlayers = data.numTeams * data.playersPerTeam

  // Merge time into date if provided
  function buildDateTime(date: string, time: string | null | undefined): Date {
    if (time) return new Date(`${date}T${time}:00`)
    return new Date(date)
  }

  const isPublic = data.visibility === 'PUBLIC'

  const tournament = await prisma.tournament.create({
    data: {
      slug,
      name: data.name,
      sportId: data.sportId,
      createdBy: user.id,
      startDate: buildDateTime(data.startDate, data.startTime),
      endDate: buildDateTime(data.endDate, data.endTime),
      venue: data.venue,
      venueAddress: data.venueAddress,
      timezone: data.timezone,
      description: data.description,
      numTeams: data.numTeams,
      playersPerTeam: data.playersPerTeam,
      numGroups: data.numGroups,
      maxPlayers,
      matchFormat: data.matchFormat,
      scoringConfig: data.scoringConfig,
      standingsConfig: data.standingsConfig,
      tiebreakConfig: data.tiebreakConfig,
      registrationConfig: data.registrationConfig,
      logoUrl: data.logoUrl,
      bannerUrl: data.bannerUrl,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      visibility: data.visibility,
      registrationCode: data.visibility === 'INVITE_ONLY' ? (data.registrationCode ?? null) : null,
      isPublic,
      // Auto-generate groups
      groups: {
        create: Array.from({ length: data.numGroups }, (_, i) => ({
          name: `Group ${String.fromCharCode(65 + i)}`,
          order: i + 1,
        })),
      },
    },
  })

  revalidatePath('/admin/tournaments')
  redirect(`/manage/${tournament.slug}`)
}

export async function publishTournament(
  tournamentId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  if (!(await isPlatformAdmin(user.id))) {
    return { success: false, error: 'Not authorized' }
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: 'REGISTRATION_OPEN' },
  })

  revalidatePath('/tournaments')
  return { success: true }
}

export async function cancelTournament(
  tournamentId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  if (!(await isPlatformAdmin(user.id))) {
    return { success: false, error: 'Not authorized' }
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { slug: true },
  })
  if (!tournament) return { success: false, error: 'Tournament not found' }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: 'CANCELLED', isPublic: false },
  })

  revalidatePath(`/manage/${tournament.slug}`)
  revalidatePath('/tournaments')
  return { success: true }
}

export async function updateTournamentStatus(
  tournamentId: string,
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED',
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  if (!(await isPlatformAdmin(user.id))) {
    return { success: false, error: 'Not authorized' }
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status },
  })

  revalidatePath('/admin/tournaments')
  return { success: true }
}
