import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { TeamAvatar } from '@/components/ui/team-avatar'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = { title: 'Standings' }
export const revalidate = 30

export default async function StandingsPage({ params }: Props) {
  const { slug } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { slug, isPublic: true },
    include: {
      groups: {
        include: {
          standings: {
            include: { team: { select: { id: true, name: true, slug: true, logoUrl: true, primaryColor: true } } },
            orderBy: { position: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  })
  if (!tournament) notFound()

  if (tournament.groups.every((g) => g.standings.length === 0)) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-text-muted text-sm">Standings will appear once matches have been played.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {tournament.groups.map((group) => (
        <div key={group.id} className="space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{group.name}</p>
          <div className="rounded-lg border border-border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1.5rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem] sm:grid-cols-[1.5rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem_3.5rem_2.5rem] gap-x-2 px-3 py-2 border-b border-border bg-surface text-xs font-semibold text-text-muted">
              <span className="text-center">#</span>
              <span>Team</span>
              <span className="text-center hidden sm:block">MP</span>
              <span className="text-center">W</span>
              <span className="text-center">D</span>
              <span className="text-center">L</span>
              <span className="text-center hidden sm:block">GD</span>
              <span className="text-center font-bold">Pts</span>
            </div>
            {/* Rows */}
            {group.standings.map((row) => (
              <div
                key={row.teamId}
                className={[
                  'grid grid-cols-[1.5rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem] sm:grid-cols-[1.5rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem_3.5rem_2.5rem] gap-x-2 px-3 py-2.5 border-b border-border last:border-0 items-center text-sm',
                  row.qualificationStatus === 'QUALIFIED' ? 'bg-success-bg/30' : '',
                  row.qualificationStatus === 'ELIMINATED' ? 'opacity-60' : '',
                ].join(' ')}
              >
                <span className="font-bold text-text-muted text-center">{row.position}</span>
                <Link
                  href={`/teams/${row.team.slug}`}
                  className="flex items-center gap-2 font-medium text-text-primary hover:text-brand-400 transition-colors min-w-0"
                >
                  <TeamAvatar name={row.team.name} logoUrl={row.team.logoUrl} primaryColor={row.team.primaryColor} size="xs" />
                  <span className="truncate">{row.team.name}</span>
                </Link>
                <span className="text-center text-text-muted hidden sm:block">{row.matchesPlayed}</span>
                <span className="text-center text-success font-medium">{row.matchesWon}</span>
                <span className="text-center text-text-muted">{row.matchesDrawn}</span>
                <span className="text-center text-error">{row.matchesLost}</span>
                <span className="text-center text-text-secondary hidden sm:block">
                  {row.gameDifferential > 0 ? `+${row.gameDifferential}` : row.gameDifferential}
                </span>
                <span className="text-center font-bold text-text-primary">{row.points}</span>
              </div>
            ))}
          </div>
          {group.standings.length > 0 && (
            <p className="text-xs text-text-muted">
              Last updated {new Date(group.standings[0].lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
