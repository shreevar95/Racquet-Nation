import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { RnCard } from '@/components/rn/RnCard'
import { ScheduleFilterList, type ScheduleMatch } from './ScheduleFilterList'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = { title: 'Schedule' }

export default async function PublicSchedulePage({ params }: Props) {
  const { slug } = await params
  const { userId: clerkId } = await auth()

  const tournament = await prisma.tournament.findUnique({
    where: { slug, isPublic: true },
    select: { id: true },
  })
  if (!tournament) notFound()

  const matches = await prisma.match.findMany({
    where: { tournamentId: tournament.id },
    select: {
      id: true,
      slug: true,
      status: true,
      scheduledAt: true,
      court: true,
      homeTeamId: true,
      awayTeamId: true,
      winnerId: true,
      homeTeamScore: true,
      awayTeamScore: true,
      homeTeam: { select: { id: true, name: true, slug: true, primaryColor: true, logoUrl: true } },
      awayTeam: { select: { id: true, name: true, slug: true, primaryColor: true, logoUrl: true } },
      group: { select: { name: true } },
    },
    orderBy: [{ scheduledAt: 'asc' }, { matchNumber: 'asc' }],
  })

  // Find which teams the logged-in user captains in this tournament
  const captainTeamIds = new Set<string>()
  if (clerkId) {
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
      select: { playerProfile: { select: { id: true } } },
    })
    if (dbUser?.playerProfile) {
      const captainships = await prisma.teamMembership.findMany({
        where: {
          playerId: dbUser.playerProfile.id,
          role: 'CAPTAIN',
          team: { tournamentId: tournament.id },
        },
        select: { teamId: true },
      })
      captainships.forEach((c) => captainTeamIds.add(c.teamId))
    }
  }

  if (matches.length === 0) {
    return (
      <RnCard className="border-dashed p-8 text-center">
        <p className="text-sm text-rn-text-muted">Schedule not published yet.</p>
      </RnCard>
    )
  }

  const lineupStatuses = ['OPEN_FOR_SUBMISSION', 'TIEBREAK_REQUIRED']

  const scheduleMatches: ScheduleMatch[] = matches.map((match) => {
    const isMyMatch = captainTeamIds.has(match.homeTeam.id) || captainTeamIds.has(match.awayTeam.id)
    const captainTeamId = lineupStatuses.includes(match.status) && isMyMatch
      ? (captainTeamIds.has(match.homeTeam.id) ? match.homeTeam.id : match.awayTeam.id)
      : null
    const displayStatus = lineupStatuses.includes(match.status) && !isMyMatch ? 'UPCOMING' : match.status

    return {
      id: match.id,
      slug: match.slug,
      status: match.status,
      displayStatus,
      scheduledAt: match.scheduledAt ? match.scheduledAt.toISOString() : null,
      court: match.court,
      groupName: match.group?.name ?? null,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeTeamScore: match.homeTeamScore,
      awayTeamScore: match.awayTeamScore,
      winnerId: match.winnerId,
      captainTeamId,
    }
  })

  return <ScheduleFilterList matches={scheduleMatches} />
}
