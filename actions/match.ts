'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { canManageTournament, canEnterScores } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { generateMatchSlug } from '@/lib/slug'
import { z } from 'zod'

const GenerateScheduleSchema = z.object({
  tournamentId: z.string().min(1),
  groupId: z.string().min(1),
})

export async function generateRoundRobinSchedule(
  input: z.infer<typeof GenerateScheduleSchema>,
): Promise<{ success: boolean; matchCount?: number; error?: string }> {
  const parsed = GenerateScheduleSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const user = await requireAuth()
  if (!(await canManageTournament(user.id, parsed.data.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  const group = await prisma.tournamentGroup.findUnique({
    where: { id: parsed.data.groupId },
    include: {
      teams: { select: { id: true, name: true } },
      tournament: { select: { slug: true, matchFormat: true } },
    },
  })
  if (!group) return { success: false, error: 'Group not found' }

  const teams: { id: string; name: string }[] = group.teams
  if (teams.length < 2) return { success: false, error: 'Need at least 2 teams' }

  // Round-robin algorithm: every team plays every other team once
  const matchPairs: [string, string][] = []
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matchPairs.push([teams[i].id, teams[j].id])
    }
  }

  // Delete existing unplayed matches for this group
  await prisma.match.deleteMany({
    where: { groupId: parsed.data.groupId, status: 'UPCOMING' },
  })

  const tournamentFormat = group.tournament.matchFormat as { gameTypes?: Record<string, string> } | null
  const gameTypes = tournamentFormat?.gameTypes ?? null

  let round = 1
  const matchData = []
  for (const [homeId, awayId] of matchPairs) {
    const homeTeam = teams.find((t) => t.id === homeId)!
    const awayTeam = teams.find((t) => t.id === awayId)!
    const slug = await generateMatchSlug(homeTeam.name, awayTeam.name, round)

    matchData.push({
      tournamentId: parsed.data.tournamentId,
      groupId: parsed.data.groupId,
      homeTeamId: homeId,
      awayTeamId: awayId,
      slug,
      round,
      matchNumber: matchData.length + 1,
      ...(gameTypes && { gameTypes }),
    })
    round++
  }

  await prisma.match.createMany({ data: matchData })

  revalidatePath(`/manage/${group.tournament.slug}/schedule`)
  return { success: true, matchCount: matchData.length }
}

const ScheduleMatchSchema = z.object({
  matchId: z.string().min(1),
  scheduledAt: z.string().min(1),
  court: z.string().max(50).optional().nullable(),
})

export async function scheduleMatch(
  input: z.infer<typeof ScheduleMatchSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = ScheduleMatchSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const user = await requireAuth()
  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    select: { tournamentId: true, tournament: { select: { slug: true } } },
  })
  if (!match) return { success: false, error: 'Match not found' }
  if (!(await canManageTournament(user.id, match.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  await prisma.match.update({
    where: { id: parsed.data.matchId },
    data: {
      scheduledAt: new Date(parsed.data.scheduledAt),
      court: parsed.data.court ?? null,
    },
  })

  revalidatePath(`/manage/${match.tournament.slug}/schedule`)
  return { success: true }
}
