import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatDate, formatScore } from '@/lib/utils'

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
      homeTeam: { select: { name: true, slug: true } },
      awayTeam: { select: { name: true, slug: true } },
      games: { orderBy: { gameNumber: 'asc' } },
    },
    orderBy: { completedAt: 'desc' },
  })

  if (matches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-text-muted text-sm">No results yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {matches.map((match) => (
        <Link
          key={match.id}
          href={`/matches/${match.slug}`}
          className="block rounded-lg border border-border bg-surface-raised p-4 hover:border-brand-500/40 transition-colors"
        >
          {/* Score header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className={['text-base font-bold', match.winnerId === match.homeTeamId ? 'text-text-primary' : 'text-text-muted'].join(' ')}>
                  {match.homeTeam.name}
                </p>
                <p className={['text-2xl font-black tabular-nums', match.winnerId === match.homeTeamId ? 'text-text-primary' : 'text-text-muted'].join(' ')}>
                  {match.homeTeamScore ?? '—'}
                </p>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <p className={['text-base font-bold', match.winnerId === match.awayTeamId ? 'text-text-primary' : 'text-text-muted'].join(' ')}>
                  {match.awayTeam.name}
                </p>
                <p className={['text-2xl font-black tabular-nums', match.winnerId === match.awayTeamId ? 'text-text-primary' : 'text-text-muted'].join(' ')}>
                  {match.awayTeamScore ?? '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Per-game breakdown */}
          {match.games.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {match.games.map((g) => (
                <span
                  key={g.gameNumber}
                  className="text-xs rounded bg-surface px-2 py-0.5 text-text-muted border border-border"
                >
                  G{g.gameNumber}: {g.homeScore}–{g.awayScore}
                </span>
              ))}
            </div>
          )}

          {match.completedAt && (
            <p className="mt-2 text-xs text-text-muted">{formatDate(match.completedAt)}</p>
          )}
        </Link>
      ))}
    </div>
  )
}
