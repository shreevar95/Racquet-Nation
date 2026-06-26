import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

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

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <Link key={match.id} href={`/matches/${match.slug}`}>
          <RnCard className="rn-card-hover p-4">
            {/* Score header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <RnTeamTile name={match.homeTeam.name} color={match.homeTeam.primaryColor} logoUrl={match.homeTeam.logoUrl} size="sm" />
                  <p className={cn('truncate text-base font-bold', match.winnerId === match.homeTeamId ? 'text-ink' : 'text-rn-text-muted')}>
                    {match.homeTeam.name}
                  </p>
                </div>
                <p className={cn('font-nunito text-2xl font-black tabular-nums', match.winnerId === match.homeTeamId ? 'text-rn-green' : 'text-rn-text-muted')}>
                  {match.homeTeamScore ?? '—'}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <RnTeamTile name={match.awayTeam.name} color={match.awayTeam.primaryColor} logoUrl={match.awayTeam.logoUrl} size="sm" />
                  <p className={cn('truncate text-base font-bold', match.winnerId === match.awayTeamId ? 'text-ink' : 'text-rn-text-muted')}>
                    {match.awayTeam.name}
                  </p>
                </div>
                <p className={cn('font-nunito text-2xl font-black tabular-nums', match.winnerId === match.awayTeamId ? 'text-rn-green' : 'text-rn-text-muted')}>
                  {match.awayTeamScore ?? '—'}
                </p>
              </div>
            </div>

            {/* Per-game breakdown */}
            {match.games.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {match.games.map((g) => (
                  <span
                    key={g.gameNumber}
                    className="rounded border border-rn-border bg-paper px-2 py-0.5 text-xs text-rn-text-muted"
                  >
                    G{g.gameNumber}: {g.homeScore}–{g.awayScore}
                  </span>
                ))}
              </div>
            )}

            {match.completedAt && (
              <p className="mt-2 text-xs text-rn-text-muted">{formatDate(match.completedAt)}</p>
            )}
          </RnCard>
        </Link>
      ))}
    </div>
  )
}
