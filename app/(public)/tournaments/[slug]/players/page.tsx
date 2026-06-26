import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RnCard } from '@/components/rn/RnCard'
import { PlayersFilterList } from './PlayersFilterList'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = { title: 'Players' }
export const revalidate = 300

export default async function PublicPlayersPage({ params }: Props) {
  const { slug } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { slug, isPublic: true },
    select: { id: true },
  })
  if (!tournament) notFound()

  const registrations = await prisma.registration.findMany({
    where: { tournamentId: tournament.id, status: 'APPROVED' },
    include: {
      player: {
        include: {
          user: { select: { name: true, avatarUrl: true } },
          teamMemberships: {
            where: { team: { tournamentId: tournament.id } },
            include: { team: { select: { name: true, slug: true } } },
          },
        },
      },
    },
    orderBy: { player: { user: { name: 'asc' } } },
  })

  if (registrations.length === 0) {
    return (
      <RnCard className="border-dashed p-8 text-center">
        <p className="text-sm text-rn-text-muted">No players registered yet.</p>
      </RnCard>
    )
  }

  const players = registrations.map((reg) => ({
    id: reg.id,
    slug: reg.player.slug,
    name: reg.player.user.name,
    avatarUrl: reg.player.user.avatarUrl,
    teamName: reg.player.teamMemberships[0]?.team.name ?? null,
  }))

  return <PlayersFilterList players={players} />
}
