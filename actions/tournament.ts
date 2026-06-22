'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { isPlatformAdmin, canManageTournament } from '@/lib/permissions'
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

  // Merge time into date if provided
  function buildDateTime(date: string, time: string | null | undefined): Date {
    if (time) return new Date(`${date}T${time}:00`)
    return new Date(date)
  }

  const isPublic = data.visibility === 'PUBLIC'
  const maxPlayers = data.numTeams * data.playersPerTeam

  let tournamentSlug: string
  try {
    const slug = await generateTournamentSlug(data.name)
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
    tournamentSlug = tournament.slug
  } catch (err) {
    console.error('[createTournament]', err)
    return { success: false, error: 'Failed to create tournament' }
  }

  // Redirect outside try so Next.js NEXT_REDIRECT is never caught
  redirect(`/manage/${tournamentSlug}`)
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

export async function updateTournamentSettings(
  tournamentId: string,
  data: {
    name: string
    venue: string
    venueAddress: string | null
    description: string | null
    rules: string | null
  },
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  if (!(await canManageTournament(user.id, tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { slug: true } })
  if (!tournament) return { success: false, error: 'Not found' }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      name: data.name,
      venue: data.venue,
      venueAddress: data.venueAddress,
      description: data.description,
      rules: data.rules,
    },
  })

  revalidatePath(`/manage/${tournament.slug}`)
  revalidatePath(`/tournaments/${tournament.slug}`)
  revalidatePath(`/tournaments/${tournament.slug}/rules`)
  return { success: true }
}

export async function updateTournamentFull(
  tournamentId: string,
  input: CreateTournamentInput,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  if (!(await canManageTournament(user.id, tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  const parsed = CreateTournamentSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const data = parsed.data

  function buildDateTime(date: string, time: string | null | undefined): Date {
    if (time) return new Date(`${date}T${time}:00`)
    return new Date(date)
  }

  const isPublic = data.visibility === 'PUBLIC'
  const maxPlayers = data.numTeams * data.playersPerTeam

  const tournament = await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      name: data.name,
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
    },
    select: { slug: true },
  })

  revalidatePath(`/manage/${tournament.slug}`)
  revalidatePath(`/manage/${tournament.slug}/settings`)
  revalidatePath(`/tournaments/${tournament.slug}`)
  return { success: true }
}

export async function reopenRegistration(
  tournamentId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  if (!(await canManageTournament(user.id, tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true, slug: true },
  })
  if (!tournament) return { success: false, error: 'Tournament not found' }
  if (tournament.status !== 'REGISTRATION_CLOSED') {
    return { success: false, error: 'Registration is not currently closed' }
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: 'REGISTRATION_OPEN' },
  })

  revalidatePath(`/manage/${tournament.slug}`)
  revalidatePath(`/tournaments/${tournament.slug}`)
  return { success: true }
}

export async function closeRegistration(
  tournamentId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  if (!(await canManageTournament(user.id, tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true, slug: true },
  })
  if (!tournament) return { success: false, error: 'Tournament not found' }
  if (tournament.status !== 'REGISTRATION_OPEN') {
    return { success: false, error: 'Registration is not currently open' }
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: 'REGISTRATION_CLOSED' },
  })

  revalidatePath(`/manage/${tournament.slug}`)
  revalidatePath(`/tournaments/${tournament.slug}`)
  return { success: true }
}

export async function deleteTournament(
  tournamentId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  if (!(await isPlatformAdmin(user.id))) {
    return { success: false, error: 'Not authorized' }
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true, slug: true },
  })
  if (!tournament) return { success: false, error: 'Tournament not found' }
  if (tournament.status !== 'CANCELLED') {
    return { success: false, error: 'Only cancelled tournaments can be deleted' }
  }

  await prisma.tournament.delete({ where: { id: tournamentId } })

  revalidatePath('/admin/tournaments')
  redirect('/admin/tournaments')
}

export async function reviveTournament(
  tournamentId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  if (!(await isPlatformAdmin(user.id))) {
    return { success: false, error: 'Not authorized' }
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { status: true, slug: true },
  })
  if (!tournament) return { success: false, error: 'Tournament not found' }
  if (tournament.status !== 'CANCELLED') {
    return { success: false, error: 'Tournament is not cancelled' }
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: 'DRAFT', isPublic: false },
  })

  revalidatePath(`/manage/${tournament.slug}`)
  revalidatePath('/admin/tournaments')
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
