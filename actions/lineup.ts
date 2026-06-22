'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { canSubmitLineup, isTournamentAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getPlayersPerSide } from '@/lib/gameTypes'
import { z } from 'zod'

const SlotSchema = z.object({
  gameNumber: z.number().int().min(1),
  position: z.number().int().min(1).max(2),
  playerId: z.string().min(1),
})

const SubmitLineupSchema = z.object({
  matchId: z.string().min(1),
  teamId: z.string().min(1),
  slots: z.array(SlotSchema).min(1),
})

export async function submitLineup(
  input: z.infer<typeof SubmitLineupSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = SubmitLineupSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }

  const user = await requireAuth()
  if (!(await canSubmitLineup(user.id, parsed.data.matchId, parsed.data.teamId))) {
    return { success: false, error: 'Not authorized or window closed' }
  }

  // Validate slot counts per game match their game type
  const matchRecord = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    select: { gameTypes: true, tournament: { select: { matchFormat: true } } },
  })
  const matchGameTypes = (matchRecord?.gameTypes ?? (matchRecord?.tournament.matchFormat as Record<string, unknown>)?.gameTypes ?? {}) as Record<string, string>
  const fallbackPlayersPerSide = ((matchRecord?.tournament.matchFormat as Record<string, unknown>)?.playersPerSide as number) ?? 2

  const slotsByGame = new Map<number, string[]>()
  for (const s of parsed.data.slots) {
    const arr = slotsByGame.get(s.gameNumber) ?? []
    arr.push(s.playerId)
    slotsByGame.set(s.gameNumber, arr)
  }
  for (const [game, playerIds] of slotsByGame) {
    const expected = getPlayersPerSide(matchGameTypes[String(game)], fallbackPlayersPerSide)
    if (playerIds.length !== expected) {
      return { success: false, error: `Game ${game} expects ${expected} player(s) per side` }
    }
  }

  // All team members must appear in at least one slot
  const teamMembers = await prisma.teamMembership.findMany({
    where: { teamId: parsed.data.teamId },
    select: { playerId: true },
  })
  const submittedPlayerIds = new Set(parsed.data.slots.map((s) => s.playerId))
  const benched = teamMembers.filter((m) => !submittedPlayerIds.has(m.playerId))
  if (benched.length > 0) {
    return { success: false, error: 'All team members must be assigned to at least one game' }
  }

  // Upsert the lineup record
  const lineup = await prisma.matchLineup.upsert({
    where: { matchId_teamId: { matchId: parsed.data.matchId, teamId: parsed.data.teamId } },
    update: { submittedBy: user.id, submittedAt: new Date(), isLocked: false },
    create: {
      matchId: parsed.data.matchId,
      teamId: parsed.data.teamId,
      submittedBy: user.id,
    },
  })

  // Replace slots
  await prisma.lineupSlot.deleteMany({ where: { lineupId: lineup.id } })
  await prisma.lineupSlot.createMany({
    data: parsed.data.slots.map((s) => ({
      lineupId: lineup.id,
      gameNumber: s.gameNumber,
      position: s.position,
      playerId: s.playerId,
    })),
  })

  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    select: { tournament: { select: { slug: true } } },
  })

  if (match) revalidatePath(`/manage/${match.tournament.slug}/lineups`)
  return { success: true }
}

const LockLineupSchema = z.object({
  matchId: z.string().min(1),
})

export async function lockLineups(
  input: z.infer<typeof LockLineupSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = LockLineupSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const user = await requireAuth()
  const match = await prisma.match.findUnique({
    where: { id: parsed.data.matchId },
    select: {
      tournamentId: true,
      tournament: { select: { slug: true } },
      lineups: { select: { id: true } },
    },
  })
  if (!match) return { success: false, error: 'Match not found' }
  if (!(await isTournamentAdmin(user.id, match.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  // Lock all lineups for this match and make them visible
  await prisma.matchLineup.updateMany({
    where: { matchId: parsed.data.matchId },
    data: {
      isLocked: true,
      lockedBy: user.id,
      lockedAt: new Date(),
      isVisible: true,
    },
  })

  // Advance match status to LOCKED
  await prisma.match.update({
    where: { id: parsed.data.matchId },
    data: { status: 'LOCKED' },
  })

  revalidatePath(`/manage/${match.tournament.slug}/lineups`)
  return { success: true }
}

export async function openAllMatchesForLineup(
  tournamentId: string,
): Promise<{ success: boolean; count?: number; error?: string }> {
  const user = await requireAuth()
  if (!(await isTournamentAdmin(user.id, tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { slug: true },
  })
  if (!tournament) return { success: false, error: 'Tournament not found' }

  const result = await prisma.match.updateMany({
    where: { tournamentId, status: 'UPCOMING' },
    data: { status: 'OPEN_FOR_SUBMISSION' },
  })

  revalidatePath(`/manage/${tournament.slug}/lineups`)
  return { success: true, count: result.count }
}

export async function openLineupSubmission(
  matchId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { tournamentId: true, tournament: { select: { slug: true } } },
  })
  if (!match) return { success: false, error: 'Match not found' }
  if (!(await isTournamentAdmin(user.id, match.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { status: 'OPEN_FOR_SUBMISSION' },
  })

  revalidatePath(`/manage/${match.tournament.slug}/lineups`)
  return { success: true }
}
