import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = { title: 'Teams' }
export const revalidate = 300

export default async function PublicTeamsPage({ params }: Props) {
  const { slug } = await params
  const tournament = await prisma.tournament.findUnique({
    where: { slug, isPublic: true },
    include: {
      groups: {
        include: {
          teams: {
            include: {
              memberships: {
                include: { player: { include: { user: { select: { name: true, avatarUrl: true } } } } },
                where: { role: 'CAPTAIN' },
              },
              _count: { select: { memberships: true } },
            },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  })
  if (!tournament) notFound()

  return (
    <div className="space-y-6">
      {tournament.groups.map((group) => (
        <div key={group.id} className="space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">{group.name}</p>
          <div className="space-y-2">
            {group.teams.map((team) => {
              const captain = team.memberships[0]?.player
              return (
                <Link
                  key={team.id}
                  href={`/teams/${team.slug}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised p-3 hover:border-brand-500/40 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg border border-border bg-surface-overlay shrink-0 flex items-center justify-center">
                    {team.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.logoUrl} alt={team.name} className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-xs font-bold text-text-muted">
                        {team.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{team.name}</p>
                    {captain && (
                      <p className="text-xs text-text-muted">
                        Captain: {captain.user.name}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-text-muted shrink-0">
                    {team._count.memberships} players
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
