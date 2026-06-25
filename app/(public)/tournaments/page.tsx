import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { RnPageHeader } from '@/components/rn/RnPageHeader'
import { TournamentsFilterList } from './TournamentsFilterList'

export const metadata: Metadata = {
  title: 'Tournaments',
  description: 'Browse all Racquet Nation tournaments.',
}
export const revalidate = 60

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    where: { isPublic: true, status: { not: 'ARCHIVED' } },
    select: {
      id: true,
      slug: true,
      name: true,
      venue: true,
      startDate: true,
      endDate: true,
      status: true,
      maxPlayers: true,
      sport: { select: { name: true } },
      _count: {
        select: {
          teams: true,
          registrations: { where: { status: 'APPROVED' } },
        },
      },
    },
    orderBy: { startDate: 'asc' },
  })

  return (
    <div className="min-h-screen bg-paper font-nunito text-ink">
      <RnPageHeader eyebrow="RACQUET NATION" title="Tournaments" />

      <div className="mx-auto max-w-3xl px-4 pb-10 pt-4">
        <TournamentsFilterList tournaments={tournaments} />
      </div>
    </div>
  )
}
