import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'

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

  const groupStageGroups = tournament.groups.filter((g) => g.name !== 'Final')

  return (
    <div className="space-y-6">
      {groupStageGroups.map((group) => (
        <div key={group.id} className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">{group.name}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.teams.map((team) => {
              const captain = team.memberships[0]?.player
              return (
                <Link key={team.id} href={`/teams/${team.slug}`}>
                  <RnCard className="rn-card-hover flex items-center gap-3 p-3.5">
                    <RnTeamTile name={team.name} color={team.primaryColor} logoUrl={team.logoUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{team.name}</p>
                      {captain && (
                        <p className="truncate text-xs text-rn-text-muted">
                          Captain: {captain.user.name}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs font-extrabold text-rn-text-muted">
                      {team._count.memberships} players
                    </span>
                  </RnCard>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
