'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { canManageTournament } from '@/lib/permissions'
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

  try {
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
  } catch (err) {
    console.error('[generateRoundRobinSchedule]', err)
    return { success: false, error: 'Failed to generate schedule' }
  }
}

export async function generateFinalSchedule(
  tournamentId: string,
): Promise<{ success: boolean; matchCount?: number; groupName?: string; error?: string }> {
  const user = await requireAuth()
  if (!(await canManageTournament(user.id, tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        slug: true,
        matchFormat: true,
        scoringConfig: true,
        numGroups: true,
        groups: {
          orderBy: { order: 'asc' },
          include: {
            standings: { orderBy: { position: 'asc' }, include: { team: { select: { id: true, name: true } } } },
            matches: { select: { status: true } },
          },
        },
      },
    })
    if (!tournament) return { success: false, error: 'Tournament not found' }

    const fmt = tournament.matchFormat as {
      tournamentStructure?: string
      knockoutType?: string
      teamsAdvancePerGroup?: number
      knockoutGamesPerMatch?: number
      knockoutPointsToWin?: number
      gamesPerMatch?: number
    }

    if (fmt.tournamentStructure !== 'GROUP_STAGE_PLUS_KNOCKOUT') {
      return { success: false, error: 'Tournament does not have a final stage configured' }
    }

    const teamsAdvance = fmt.teamsAdvancePerGroup ?? 1
    const knockoutType = (fmt.knockoutType ?? 'ROUND_ROBIN') as 'ROUND_ROBIN' | 'BRACKET'

    // Separate group-stage groups from any existing Final group
    const groupStageGroups = tournament.groups.filter((g) => g.name !== 'Final')
    const existingFinalGroup = tournament.groups.find((g) => g.name === 'Final')

    // Get qualifying teams — top N from each group stage group
    const qualifiers: { teamId: string; teamName: string; seed: number }[] = []
    for (const group of groupStageGroups) {
      const top = group.standings.slice(0, teamsAdvance)
      for (const row of top) {
        qualifiers.push({ teamId: row.teamId, teamName: row.team.name, seed: qualifiers.length + 1 })
      }
    }

    if (qualifiers.length < 2) {
      return { success: false, error: 'Not enough qualified teams. Ensure group stage standings are calculated.' }
    }

    // Create or reuse the Final group
    const finalGroupId = existingFinalGroup?.id ?? (
      await prisma.tournamentGroup.create({
        data: { tournamentId, name: 'Final', order: tournament.numGroups + 1 },
        select: { id: true },
      })
    ).id

    // Delete any existing UPCOMING matches in the final group before regenerating
    await prisma.match.deleteMany({ where: { groupId: finalGroupId, status: 'UPCOMING' } })

    // Initialise standings for qualifying teams in the Final group
    await Promise.all(
      qualifiers.map((q, i) =>
        prisma.standings.upsert({
          where: { tournamentId_groupId_teamId: { tournamentId, groupId: finalGroupId, teamId: q.teamId } },
          create: {
            tournamentId,
            groupId: finalGroupId,
            teamId: q.teamId,
            position: i + 1,
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0,
            matchesDrawn: 0,
            gamesWon: 0,
            gamesLost: 0,
            gameDifferential: 0,
            points: 0,
          },
          update: {},
        }),
      ),
    )

    let matchCount = 0

    if (knockoutType === 'ROUND_ROBIN') {
      const pairs: [typeof qualifiers[0], typeof qualifiers[0]][] = []
      for (let i = 0; i < qualifiers.length; i++) {
        for (let j = i + 1; j < qualifiers.length; j++) {
          pairs.push([qualifiers[i], qualifiers[j]])
        }
      }
      for (const [home, away] of pairs) {
        const slug = await generateMatchSlug(home.teamName, away.teamName, 1)
        await prisma.match.create({
          data: {
            tournamentId,
            groupId: finalGroupId,
            homeTeamId: home.teamId,
            awayTeamId: away.teamId,
            slug,
            round: 1,
            matchNumber: matchCount + 1,
          },
        })
        matchCount++
      }
    } else {
      // BRACKET — single elimination, seeded pairing: 1v(n), 2v(n-1)...
      const n = qualifiers.length
      let bracketSize = 1
      while (bracketSize < n) bracketSize *= 2
      const byes = bracketSize - n

      const slots: (typeof qualifiers[0] | null)[] = []
      for (let i = 0; i < n; i++) slots.push(qualifiers[i])
      for (let i = 0; i < byes; i++) slots.push(null)

      let round = 1
      for (let i = 0; i < slots.length; i += 2) {
        const home = slots[i]
        const away = slots[slots.length - 1 - i / 2] ?? null
        if (!home) continue
        if (!away) continue // bye — home advances, no match
        const slug = await generateMatchSlug(home.teamName, away.teamName, round)
        await prisma.match.create({
          data: {
            tournamentId,
            groupId: finalGroupId,
            homeTeamId: home.teamId,
            awayTeamId: away.teamId,
            slug,
            round,
            matchNumber: matchCount + 1,
          },
        })
        matchCount++
      }
    }

    revalidatePath(`/manage/${tournament.slug}/schedule`)
    revalidatePath(`/manage/${tournament.slug}`)
    return { success: true, matchCount, groupName: 'Final' }
  } catch (err) {
    console.error('[generateFinalSchedule]', err)
    return { success: false, error: 'Failed to generate final schedule' }
  }
}

const ScheduleMatchSchema = z.object({
  matchId: z.string().min(1),
  scheduledAt: z.string().min(1),
  court: z.string().max(50).optional().nullable(),
})

export async function openMatchForLineup(
  matchId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { tournamentId: true, status: true, tournament: { select: { slug: true } } },
  })
  if (!match) return { success: false, error: 'Match not found' }
  if (!(await canManageTournament(user.id, match.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }
  if (match.status !== 'UPCOMING') {
    return { success: false, error: 'Match must be in UPCOMING status' }
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { status: 'OPEN_FOR_SUBMISSION' },
  })

  revalidatePath(`/manage/${match.tournament.slug}/schedule`)
  return { success: true }
}

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
