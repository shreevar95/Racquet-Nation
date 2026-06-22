'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { canManageTournament, isTeamCaptain } from '@/lib/permissions'
import { pushToUser } from '@/lib/push'
import { prisma } from '@/lib/prisma'
import { generateTeamSlug } from '@/lib/slug'
import { z } from 'zod'

const CreateTeamSchema = z.object({
  tournamentId: z.string().min(1),
  name: z.string().min(1, 'Team name required').max(80),
  groupId: z.string().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
})

export async function createTeam(
  input: z.infer<typeof CreateTeamSchema>,
): Promise<{ success: boolean; teamId?: string; error?: string }> {
  const parsed = CreateTeamSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message }

  const user = await requireAuth()
  if (!(await canManageTournament(user.id, parsed.data.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: parsed.data.tournamentId },
    select: { slug: true },
  })
  if (!tournament) return { success: false, error: 'Tournament not found' }

  const slug = await generateTeamSlug(parsed.data.tournamentId, parsed.data.name)

  const team = await prisma.team.create({
    data: {
      tournamentId: parsed.data.tournamentId,
      name: parsed.data.name,
      slug,
      groupId: parsed.data.groupId ?? null,
      primaryColor: parsed.data.primaryColor ?? null,
      logoUrl: parsed.data.logoUrl ?? null,
    },
  })

  revalidatePath(`/manage/${tournament.slug}/teams`)
  return { success: true, teamId: team.id }
}

const AssignPlayerSchema = z.object({
  teamId: z.string().min(1),
  playerId: z.string().min(1),
  role: z.enum(['PLAYER', 'CAPTAIN', 'MANAGER']).default('PLAYER'),
})

export async function assignPlayerToTeam(
  input: z.infer<typeof AssignPlayerSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = AssignPlayerSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const user = await requireAuth()
  const team = await prisma.team.findUnique({
    where: { id: parsed.data.teamId },
    select: { tournamentId: true, tournament: { select: { slug: true } } },
  })
  if (!team) return { success: false, error: 'Team not found' }
  if (!(await canManageTournament(user.id, team.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  const existing = await prisma.teamMembership.findUnique({
    where: { teamId_playerId: { teamId: parsed.data.teamId, playerId: parsed.data.playerId } },
  })
  if (existing) return { success: false, error: 'Player already on this team' }

  await prisma.teamMembership.create({
    data: {
      teamId: parsed.data.teamId,
      playerId: parsed.data.playerId,
      role: parsed.data.role,
    },
  })

  // If assigning as captain, update team.captainId (store user.id of the player's user)
  if (parsed.data.role === 'CAPTAIN') {
    const playerProfile = await prisma.playerProfile.findUnique({
      where: { id: parsed.data.playerId },
      select: { userId: true },
    })
    if (playerProfile) {
      await prisma.team.update({
        where: { id: parsed.data.teamId },
        data: { captainId: playerProfile.userId },
      })
    }
  }

  // Notify the player
  const playerProfile = await prisma.playerProfile.findUnique({
    where: { id: parsed.data.playerId },
    include: { user: { select: { id: true } }, teamMemberships: { include: { team: { include: { tournament: { select: { name: true } } } } } } },
  })
  if (playerProfile) {
    const teamData = await prisma.team.findUnique({
      where: { id: parsed.data.teamId },
      select: { name: true, tournament: { select: { name: true, id: true } } },
    })
    if (teamData) {
      await prisma.notification.create({
        data: {
          userId: playerProfile.user.id,
          type: 'TEAM_ASSIGNED',
          title: `You've been added to ${teamData.name}`,
          body: `You are now part of team ${teamData.name} in ${teamData.tournament.name}.`,
          data: { teamId: parsed.data.teamId, tournamentId: teamData.tournament.id },
        },
      })
      await pushToUser(playerProfile.user.id, {
        title: `You're on ${teamData.name}!`,
        body: `You've been assigned to ${teamData.name} in ${teamData.tournament.name}.`,
        tag: `team-assigned-${parsed.data.teamId}`,
      })
    }
  }

  revalidatePath(`/manage/${team.tournament.slug}/teams`)
  return { success: true }
}

export async function autoCreateTeams(
  tournamentId: string,
): Promise<{ success: boolean; created: number; error?: string }> {
  const user = await requireAuth()
  if (!(await canManageTournament(user.id, tournamentId))) {
    return { success: false, created: 0, error: 'Not authorized' }
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { slug: true, numTeams: true, groups: { orderBy: { order: 'asc' } } },
  })
  if (!tournament) return { success: false, created: 0, error: 'Tournament not found' }

  const existingCount = await prisma.team.count({ where: { tournamentId } })
  if (existingCount > 0) return { success: false, created: 0, error: 'Teams already exist' }

  const numGroups = tournament.groups.length
  for (let i = 0; i < tournament.numTeams; i++) {
    const group = numGroups > 0 ? tournament.groups[i % numGroups] : null
    const name = `Team ${String.fromCharCode(65 + i)}`
    const slug = await generateTeamSlug(tournamentId, name)
    await prisma.team.create({
      data: { tournamentId, name, slug, groupId: group?.id ?? null },
    })
  }

  revalidatePath(`/manage/${tournament.slug}/teams`)
  return { success: true, created: tournament.numTeams }
}

export async function setTeamCaptain(
  teamId: string,
  playerId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { tournamentId: true, tournament: { select: { slug: true } } },
  })
  if (!team) return { success: false, error: 'Team not found' }
  if (!(await canManageTournament(user.id, team.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  // Demote current captain, promote new one
  await prisma.teamMembership.updateMany({ where: { teamId, role: 'CAPTAIN' }, data: { role: 'PLAYER' } })
  await prisma.teamMembership.update({
    where: { teamId_playerId: { teamId, playerId } },
    data: { role: 'CAPTAIN' },
  })

  const profile = await prisma.playerProfile.findUnique({ where: { id: playerId }, select: { userId: true } })
  if (profile) {
    await prisma.team.update({ where: { id: teamId }, data: { captainId: profile.userId } })
  }

  revalidatePath(`/manage/${team.tournament.slug}/teams`)
  return { success: true }
}

export async function randomiseTeamAssignments(
  tournamentId: string,
  clearExisting = false,
): Promise<{ success: boolean; assigned: number; createdTeamIds: string[]; error?: string }> {
  const user = await requireAuth()
  if (!(await canManageTournament(user.id, tournamentId))) {
    return { success: false, assigned: 0, createdTeamIds: [], error: 'Not authorized' }
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        slug: true,
        numTeams: true,
        playersPerTeam: true,
        groups: { orderBy: { order: 'asc' } },
      },
    })
    if (!tournament) return { success: false, assigned: 0, createdTeamIds: [], error: 'Tournament not found' }

    if (clearExisting) {
      await prisma.teamMembership.deleteMany({ where: { team: { tournamentId } } })
      await prisma.team.updateMany({ where: { tournamentId }, data: { captainId: null } })
    }

    const unassigned = await prisma.registration.findMany({
      where: {
        tournamentId,
        status: 'APPROVED',
        player: { teamMemberships: { none: { team: { tournamentId } } } },
      },
      select: { player: { select: { id: true, selfRating: true } } },
    })

    if (unassigned.length === 0) {
      revalidatePath(`/manage/${tournament.slug}/teams`)
      return { success: true, assigned: 0, createdTeamIds: [] }
    }

    // Separate rated and unrated players
    type Entry = { id: string; rating: number | null }
    const rated: Entry[] = unassigned
      .filter((r) => r.player.selfRating !== null)
      .map((r) => ({ id: r.player.id, rating: r.player.selfRating }))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))

    const unrated: Entry[] = unassigned
      .filter((r) => r.player.selfRating === null)
      .map((r) => ({ id: r.player.id, rating: null }))

    // Fisher-Yates shuffle unrated
    for (let i = unrated.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[unrated[i], unrated[j]] = [unrated[j], unrated[i]]
    }

    // Rated players go first (snake draft), unrated appended (random)
    const ordered = [...rated, ...unrated]

    // Teams must already exist — use autoCreateTeams first
    const teams = await prisma.team.findMany({
      where: { tournamentId },
      select: { id: true, memberships: { select: { playerId: true } } },
      orderBy: { createdAt: 'asc' },
    })

    if (teams.length === 0) {
      return { success: false, assigned: 0, createdTeamIds: [], error: 'Create teams first, then randomise.' }
    }

    const createdTeamIds: string[] = []

    // Snake draft: even rounds go left→right, odd rounds go right→left
    // This distributes the highest-rated players evenly across teams
    let playerIdx = 0
    let round = 0
    let assigned = 0

    while (playerIdx < ordered.length) {
      let assignedInRound = false
      for (let i = 0; i < teams.length && playerIdx < ordered.length; i++) {
        const teamIdx = round % 2 === 0 ? i : teams.length - 1 - i
        const team = teams[teamIdx]
        if (team.memberships.length < tournament.playersPerTeam) {
          const playerId = ordered[playerIdx].id
          const isFirstOnTeam = team.memberships.length === 0
          const role = isFirstOnTeam ? 'CAPTAIN' : 'PLAYER'

          await prisma.teamMembership.create({ data: { teamId: team.id, playerId, role } })

          if (isFirstOnTeam) {
            const profile = await prisma.playerProfile.findUnique({
              where: { id: playerId },
              select: { userId: true },
            })
            if (profile) {
              await prisma.team.update({ where: { id: team.id }, data: { captainId: profile.userId } })
            }
          }

          team.memberships.push({ playerId })
          assigned++
          playerIdx++
          assignedInRound = true
        }
      }
      round++
      if (!assignedInRound) break // All teams full
    }

    revalidatePath(`/manage/${tournament.slug}/teams`)
    return { success: true, assigned, createdTeamIds }
  } catch (err) {
    console.error('[randomiseTeamAssignments]', err)
    return { success: false, assigned: 0, createdTeamIds: [], error: 'Failed to assign players' }
  }
}

const SnapshotMembershipSchema = z.object({
  teamId: z.string(),
  playerId: z.string(),
  role: z.enum(['PLAYER', 'CAPTAIN', 'MANAGER']),
})

const SnapshotCaptainSchema = z.object({
  teamId: z.string(),
  captainId: z.string().nullable(),
})

export async function restoreTeamSnapshot(input: {
  tournamentId: string
  memberships: z.infer<typeof SnapshotMembershipSchema>[]
  captains: z.infer<typeof SnapshotCaptainSchema>[]
  createdTeamIds: string[]
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  if (!(await canManageTournament(user.id, input.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: input.tournamentId },
    select: { slug: true },
  })
  if (!tournament) return { success: false, error: 'Tournament not found' }

  // Wipe current assignments
  await prisma.teamMembership.deleteMany({ where: { team: { tournamentId: input.tournamentId } } })
  await prisma.team.updateMany({ where: { tournamentId: input.tournamentId }, data: { captainId: null } })

  // Delete teams that were auto-created by the randomiser
  if (input.createdTeamIds.length > 0) {
    await prisma.team.deleteMany({ where: { id: { in: input.createdTeamIds } } })
  }

  // Restore memberships
  if (input.memberships.length > 0) {
    await prisma.teamMembership.createMany({ data: input.memberships })
  }

  // Restore captain IDs
  for (const { teamId, captainId } of input.captains) {
    if (input.createdTeamIds.includes(teamId)) continue // team was deleted
    await prisma.team.update({ where: { id: teamId }, data: { captainId } })
  }

  revalidatePath(`/manage/${tournament.slug}/teams`)
  return { success: true }
}

export async function movePlayerToTeam(
  playerId: string,
  fromTeamId: string,
  toTeamId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()

  const fromTeam = await prisma.team.findUnique({
    where: { id: fromTeamId },
    select: { tournamentId: true, tournament: { select: { slug: true } } },
  })
  if (!fromTeam) return { success: false, error: 'Source team not found' }
  if (!(await canManageTournament(user.id, fromTeam.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  const toTeam = await prisma.team.findUnique({
    where: { id: toTeamId },
    select: { id: true, memberships: { select: { playerId: true } } },
  })
  if (!toTeam) return { success: false, error: 'Destination team not found' }

  const membership = await prisma.teamMembership.findUnique({
    where: { teamId_playerId: { teamId: fromTeamId, playerId } },
    select: { role: true },
  })
  if (!membership) return { success: false, error: 'Player is not on this team' }

  // Already on destination
  const alreadyOnTo = await prisma.teamMembership.findUnique({
    where: { teamId_playerId: { teamId: toTeamId, playerId } },
  })
  if (alreadyOnTo) return { success: false, error: 'Player is already on the destination team' }

  // Remove from source
  await prisma.teamMembership.delete({ where: { teamId_playerId: { teamId: fromTeamId, playerId } } })
  if (membership.role === 'CAPTAIN') {
    await prisma.team.update({ where: { id: fromTeamId }, data: { captainId: null } })
  }

  // Add to destination (captain if team is currently empty)
  const isDestEmpty = toTeam.memberships.length === 0
  const newRole = isDestEmpty ? 'CAPTAIN' : 'PLAYER'
  await prisma.teamMembership.create({ data: { teamId: toTeamId, playerId, role: newRole } })

  if (isDestEmpty) {
    const profile = await prisma.playerProfile.findUnique({ where: { id: playerId }, select: { userId: true } })
    if (profile) {
      await prisma.team.update({ where: { id: toTeamId }, data: { captainId: profile.userId } })
    }
  }

  revalidatePath(`/manage/${fromTeam.tournament.slug}/teams`)
  return { success: true }
}

export async function updateTeamName(
  teamId: string,
  name: string,
): Promise<{ success: boolean; error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { success: false, error: 'Name cannot be empty' }
  if (trimmed.length > 80) return { success: false, error: 'Name too long' }

  const user = await requireAuth()
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { tournamentId: true, tournament: { select: { slug: true } } },
  })
  if (!team) return { success: false, error: 'Team not found' }

  const canAdmin = await canManageTournament(user.id, team.tournamentId)
  const canCaptain = await isTeamCaptain(user.id, teamId)
  if (!canAdmin && !canCaptain) return { success: false, error: 'Not authorized' }

  await prisma.team.update({ where: { id: teamId }, data: { name: trimmed } })
  revalidatePath(`/manage/${team.tournament.slug}/teams`)
  return { success: true }
}

export async function deleteTeam(
  teamId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { tournamentId: true, tournament: { select: { slug: true } } },
  })
  if (!team) return { success: false, error: 'Team not found' }
  if (!(await canManageTournament(user.id, team.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  const matchCount = await prisma.match.count({
    where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
  })
  if (matchCount > 0) {
    return { success: false, error: 'Cannot delete a team that has scheduled matches' }
  }

  await prisma.standings.deleteMany({ where: { teamId } })
  await prisma.registration.updateMany({ where: { teamId }, data: { teamId: null } })
  await prisma.team.delete({ where: { id: teamId } })

  revalidatePath(`/manage/${team.tournament.slug}/teams`)
  return { success: true }
}

const RemovePlayerSchema = z.object({
  teamId: z.string().min(1),
  playerId: z.string().min(1),
})

export async function removePlayerFromTeam(
  input: z.infer<typeof RemovePlayerSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = RemovePlayerSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const user = await requireAuth()
  const team = await prisma.team.findUnique({
    where: { id: parsed.data.teamId },
    select: { tournamentId: true, tournament: { select: { slug: true } } },
  })
  if (!team) return { success: false, error: 'Team not found' }
  if (!(await canManageTournament(user.id, team.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  await prisma.teamMembership.deleteMany({
    where: { teamId: parsed.data.teamId, playerId: parsed.data.playerId },
  })

  revalidatePath(`/manage/${team.tournament.slug}/teams`)
  return { success: true }
}

export async function updateTeamAvatar(
  teamId: string,
  data: { logoUrl: string | null; primaryColor: string | null },
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { tournamentId: true, tournament: { select: { slug: true } } },
  })
  if (!team) return { success: false, error: 'Team not found' }
  const canAdmin = await canManageTournament(user.id, team.tournamentId)
  const canCaptain = await isTeamCaptain(user.id, teamId)
  if (!canAdmin && !canCaptain) return { success: false, error: 'Not authorized' }

  await prisma.team.update({
    where: { id: teamId },
    data: { logoUrl: data.logoUrl, primaryColor: data.primaryColor },
  })

  revalidatePath(`/manage/${team.tournament.slug}/teams`)
  revalidatePath(`/teams`)
  return { success: true }
}
