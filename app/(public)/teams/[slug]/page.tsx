import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  // slug is per-tournament, so find by tournament context — here we do a broad search
  const team = await prisma.team.findFirst({
    where: { slug },
    include: { tournament: { select: { name: true } } },
  })
  return { title: team ? `${team.name} · ${team.tournament.name}` : 'Team' }
}

export const revalidate = 300

export default async function PublicTeamPage({ params }: Props) {
  const { slug } = await params
  const team = await prisma.team.findFirst({
    where: { slug },
    include: {
      tournament: { select: { name: true, slug: true } },
      group: { select: { name: true } },
      memberships: {
        include: { player: { include: { user: { select: { name: true, avatarUrl: true } } } } },
        orderBy: { role: 'asc' },
      },
      homeMatches: {
        where: { status: 'COMPLETED' },
        include: { awayTeam: { select: { name: true, slug: true } } },
        orderBy: { completedAt: 'desc' },
        take: 5,
      },
      awayMatches: {
        where: { status: 'COMPLETED' },
        include: { homeTeam: { select: { name: true, slug: true } } },
        orderBy: { completedAt: 'desc' },
        take: 5,
      },
    },
  })
  if (!team) notFound()

  const allResults = [
    ...team.homeMatches.map((m) => ({
      opponent: m.awayTeam.name,
      won: m.winnerId === team.id,
      homeScore: m.homeTeamScore,
      awayScore: m.awayTeamScore,
      matchSlug: m.slug,
      isHome: true,
    })),
    ...team.awayMatches.map((m) => ({
      opponent: m.homeTeam.name,
      won: m.winnerId === team.id,
      homeScore: m.homeTeamScore,
      awayScore: m.awayTeamScore,
      matchSlug: m.slug,
      isHome: false,
    })),
  ].sort((a, b) => 0)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-xl border border-border bg-surface-overlay flex items-center justify-center shrink-0">
            {team.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={team.logoUrl} alt={team.name} className="h-full w-full object-cover rounded-xl" />
            ) : (
              <span className="text-sm font-black text-text-muted">
                {team.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black text-text-primary">{team.name}</h1>
            <Link href={`/tournaments/${team.tournament.slug}`} className="text-sm text-brand-400 hover:text-brand-300">
              {team.tournament.name}
            </Link>
            {team.group && (
              <p className="text-xs text-text-muted mt-0.5">{team.group.name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-text-primary">Roster</p>
        <div className="space-y-1">
          {team.memberships.map((m) => (
            <Link
              key={m.id}
              href={`/players/${m.player.slug}`}
              className="flex items-center gap-2.5 rounded-lg border border-border bg-surface-raised p-2.5 hover:border-brand-500/40 transition-colors"
            >
              <Avatar src={m.player.user.avatarUrl} name={m.player.user.name} size="sm" />
              <span className="flex-1 text-sm text-text-primary">{m.player.user.name}</span>
              {m.role !== 'PLAYER' && (
                <Badge variant={m.role === 'CAPTAIN' ? 'brand' : 'default'} className="text-[10px]">
                  {m.role}
                </Badge>
              )}
            </Link>
          ))}
          {team.memberships.length === 0 && (
            <p className="text-sm text-text-muted">No players assigned yet.</p>
          )}
        </div>
      </div>

      {/* Recent results */}
      {allResults.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-text-primary">Recent Results</p>
          <div className="space-y-1">
            {allResults.slice(0, 5).map((r, i) => (
              <Link
                key={i}
                href={`/matches/${r.matchSlug}`}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-raised p-3 hover:border-brand-500/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      'w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center',
                      r.won ? 'bg-success-bg text-success' : 'bg-error-bg text-error',
                    ].join(' ')}
                  >
                    {r.won ? 'W' : 'L'}
                  </span>
                  <span className="text-sm text-text-primary">vs {r.opponent}</span>
                </div>
                <span className="text-sm font-bold text-text-muted">
                  {r.isHome ? `${r.homeScore}–${r.awayScore}` : `${r.awayScore}–${r.homeScore}`}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
