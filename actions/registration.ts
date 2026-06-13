'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth'
import { canApproveRegistrations } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { pushToUser } from '@/lib/push'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

const ApplySchema = z.object({
  tournamentId: z.string().min(1),
  formData: z.record(z.string(), z.unknown()),
  registrationCode: z.string().optional(),
})

export async function applyToTournament(
  input: z.infer<typeof ApplySchema>,
): Promise<{ success: boolean; status?: 'APPROVED' | 'WAITLISTED'; error?: string }> {
  const parsed = ApplySchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const user = await requireAuth()
  if (!user.playerProfile) return { success: false, error: 'Complete your profile first' }

  const tournament = await prisma.tournament.findUnique({
    where: { id: parsed.data.tournamentId },
    select: { status: true, registrationConfig: true, id: true, slug: true, maxPlayers: true, visibility: true, registrationCode: true },
  })
  if (!tournament) return { success: false, error: 'Tournament not found' }
  if (tournament.status !== 'REGISTRATION_OPEN') {
    return { success: false, error: 'Registration is not open' }
  }
  if (tournament.visibility === 'INVITE_ONLY') {
    if (!parsed.data.registrationCode || parsed.data.registrationCode !== tournament.registrationCode) {
      return { success: false, error: 'Invalid registration code' }
    }
  }

  const existing = await prisma.registration.findUnique({
    where: {
      tournamentId_playerId: {
        tournamentId: parsed.data.tournamentId,
        playerId: user.playerProfile.id,
      },
    },
  })
  if (existing) return { success: false, error: 'You have already applied' }

  // Auto-accept if under capacity, otherwise waitlist
  const approvedCount = await prisma.registration.count({
    where: { tournamentId: parsed.data.tournamentId, status: 'APPROVED' },
  })
  const autoStatus = approvedCount < tournament.maxPlayers ? 'APPROVED' : 'WAITLISTED'

  await prisma.registration.create({
    data: {
      tournamentId: parsed.data.tournamentId,
      playerId: user.playerProfile.id,
      status: autoStatus,
      formData: parsed.data.formData as Prisma.InputJsonValue,
    },
  })

  revalidatePath(`/tournaments/${tournament.slug}`)
  return { success: true, status: autoStatus }
}

export async function removePlayerFromTournament(
  registrationId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      playerId: true,
      tournamentId: true,
      tournament: { select: { slug: true } },
    },
  })
  if (!reg) return { success: false, error: 'Registration not found' }

  if (!(await canApproveRegistrations(user.id, reg.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  // Remove from any team in this tournament
  const membership = await prisma.teamMembership.findFirst({
    where: { playerId: reg.playerId, team: { tournamentId: reg.tournamentId } },
    select: { teamId: true, role: true },
  })
  if (membership) {
    await prisma.teamMembership.deleteMany({
      where: { playerId: reg.playerId, team: { tournamentId: reg.tournamentId } },
    })
    // Clear captainId if they were captain
    if (membership.role === 'CAPTAIN') {
      await prisma.team.update({
        where: { id: membership.teamId },
        data: { captainId: null },
      })
    }
  }

  // Move to waitlist (set appliedAt to now so they join the back of the queue)
  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: 'WAITLISTED',
      reviewedBy: user.id,
      reviewedAt: new Date(),
      appliedAt: new Date(),
    },
  })

  // Push to the removed player
  const removedPlayer = await prisma.playerProfile.findUnique({
    where: { id: reg.playerId },
    select: { userId: true },
  })
  if (removedPlayer) {
    await pushToUser(removedPlayer.userId, {
      title: 'Moved to waitlist',
      body: 'You have been moved to the waitlist for this tournament.',
      tag: `waitlisted-${reg.tournamentId}`,
    })
  }

  // Promote the next person already in the waitlist (excludes the player we just moved)
  const nextWaitlisted = await prisma.registration.findFirst({
    where: {
      tournamentId: reg.tournamentId,
      status: 'WAITLISTED',
      id: { not: registrationId },
    },
    orderBy: { appliedAt: 'asc' },
  })
  if (nextWaitlisted) {
    await prisma.registration.update({
      where: { id: nextWaitlisted.id },
      data: { status: 'APPROVED', reviewedBy: user.id, reviewedAt: new Date() },
    })
    const promotedPlayer = await prisma.playerProfile.findUnique({
      where: { id: nextWaitlisted.playerId },
      select: { userId: true },
    })
    if (promotedPlayer) {
      await pushToUser(promotedPlayer.userId, {
        title: "You're in!",
        body: 'A spot opened up — you have been moved from the waitlist to approved.',
        tag: `approved-${reg.tournamentId}`,
      })
    }
  }

  revalidatePath(`/manage/${reg.tournament.slug}/registrations`)
  revalidatePath(`/manage/${reg.tournament.slug}/teams`)
  return { success: true }
}

export async function withdrawFromTournament(
  tournamentId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await requireAuth()
  if (!user.playerProfile) return { success: false, error: 'Player profile not found' }

  const reg = await prisma.registration.findUnique({
    where: { tournamentId_playerId: { tournamentId, playerId: user.playerProfile.id } },
    select: { id: true, status: true, tournament: { select: { slug: true } } },
  })
  if (!reg) return { success: false, error: 'Registration not found' }
  if (reg.status === 'WITHDRAWN') return { success: false, error: 'Already withdrawn' }

  // Remove from team if assigned
  const membership = await prisma.teamMembership.findFirst({
    where: { playerId: user.playerProfile.id, team: { tournamentId } },
    select: { teamId: true, role: true },
  })
  if (membership) {
    await prisma.teamMembership.deleteMany({
      where: { playerId: user.playerProfile.id, team: { tournamentId } },
    })
    if (membership.role === 'CAPTAIN') {
      await prisma.team.update({ where: { id: membership.teamId }, data: { captainId: null } })
    }
  }

  await prisma.registration.update({
    where: { id: reg.id },
    data: { status: 'WITHDRAWN' },
  })

  // If was approved, promote next waitlisted player
  if (reg.status === 'APPROVED') {
    const next = await prisma.registration.findFirst({
      where: { tournamentId, status: 'WAITLISTED' },
      orderBy: { appliedAt: 'asc' },
    })
    if (next) {
      await prisma.registration.update({
        where: { id: next.id },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      })
      const promoted = await prisma.playerProfile.findUnique({
        where: { id: next.playerId },
        select: { userId: true },
      })
      if (promoted) {
        await pushToUser(promoted.userId, {
          title: "You're in!",
          body: 'A spot opened up — you have been moved from the waitlist to approved.',
          tag: `approved-${tournamentId}`,
        })
      }
    }
  }

  revalidatePath(`/tournaments/${reg.tournament.slug}`)
  return { success: true }
}

const ReviewSchema = z.object({
  registrationId: z.string().min(1),
  status: z.enum(['APPROVED', 'REJECTED', 'WAITLISTED']),
  notes: z.string().max(500).optional(),
})

export async function reviewRegistration(
  input: z.infer<typeof ReviewSchema>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = ReviewSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: 'Invalid input' }

  const user = await requireAuth()
  const reg = await prisma.registration.findUnique({
    where: { id: parsed.data.registrationId },
    select: { tournamentId: true, tournament: { select: { slug: true } } },
  })
  if (!reg) return { success: false, error: 'Registration not found' }

  if (!(await canApproveRegistrations(user.id, reg.tournamentId))) {
    return { success: false, error: 'Not authorized' }
  }

  await prisma.registration.update({
    where: { id: parsed.data.registrationId },
    data: {
      status: parsed.data.status,
      reviewedBy: user.id,
      reviewedAt: new Date(),
      notes: parsed.data.notes ?? null,
    },
  })

  // Create notification for the player
  const fullReg = await prisma.registration.findUnique({
    where: { id: parsed.data.registrationId },
    include: {
      player: { include: { user: { select: { id: true } } } },
      tournament: { select: { name: true } },
    },
  })
  if (fullReg) {
    const notifType =
      parsed.data.status === 'APPROVED'
        ? 'REGISTRATION_APPROVED'
        : parsed.data.status === 'REJECTED'
          ? 'REGISTRATION_REJECTED'
          : 'REGISTRATION_WAITLISTED'

    await prisma.notification.create({
      data: {
        userId: fullReg.player.user.id,
        type: notifType,
        title:
          parsed.data.status === 'APPROVED'
            ? `Registration Approved — ${fullReg.tournament.name}`
            : parsed.data.status === 'REJECTED'
              ? `Registration Not Accepted — ${fullReg.tournament.name}`
              : `Added to Waitlist — ${fullReg.tournament.name}`,
        body:
          parsed.data.notes ??
          (parsed.data.status === 'APPROVED'
            ? 'You have been approved. Check the tournament page for updates.'
            : 'Thank you for your interest.'),
        data: { tournamentId: reg.tournamentId },
      },
    })

    // Push notification
    if (parsed.data.status === 'APPROVED') {
      await pushToUser(fullReg.player.user.id, {
        title: `You're in — ${fullReg.tournament.name}!`,
        body: 'Your registration has been approved. See you on the court.',
        tag: `reg-approved-${reg.tournamentId}`,
      })
    } else if (parsed.data.status === 'WAITLISTED') {
      await pushToUser(fullReg.player.user.id, {
        title: `Waitlisted — ${fullReg.tournament.name}`,
        body: "You're on the waitlist. We'll notify you if a spot opens up.",
        tag: `reg-waitlisted-${reg.tournamentId}`,
      })
    }
  }

  revalidatePath(`/manage/${reg.tournament.slug}/registrations`)
  return { success: true }
}
