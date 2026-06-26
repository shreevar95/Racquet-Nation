import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RnCard } from '@/components/rn/RnCard'
import { ResultsFilterList, type ResultMatch } from './ResultsFilterList'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = { title: 'Results' }
export const revalidate = 30

export default async function ResultsPage({ params }: Props) {
  const { slug } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { slug, isPublic: true },
    select: { id: true },
  })
  if (!tournament) notFound()

  const matches = await prisma.match.findMany({
    where: { tournamentId: tournament.id, status: 'COMPLETED' },
    include: {
      homeTeam: { select: { name: true, slug: true, primaryColor: true, logoUrl: true } },
      awayTeam: { select: { name: true, slug: true, primaryColor: true, logoUrl: true } },
      games: { orderBy: { gameNumber: 'asc' } },
      group: { select: { name: true } },
    },
    orderBy: { completedAt: 'desc' },
  })

  if (matches.length === 0) {
    return (
      <RnCard className="border-dashed p-8 text-center">
        <p className="text-sm text-rn-text-muted">No results yet.</p>
      </RnCard>
    )
  }

  const resultMatches: ResultMatch[] = matches.map((match) => ({
    id: match.id,
    slug: match.slug,
    completedAt: match.completedAt ? match.completedAt.toISOString() : null,
    groupName: match.group?.name ?? null,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeTeamScore: match.homeTeamScore,
    awayTeamScore: match.awayTeamScore,
    winnerId: match.winnerId,
    games: match.games,
  }))

  return <ResultsFilterList matches={resultMatches} />
}
