import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const profile = await prisma.playerProfile.findUnique({
    where: { slug },
    include: { user: { select: { name: true } } },
  })
  if (!profile) return { title: 'Player Not Found' }
  return {
    title: profile.user.name,
    description: profile.bio ?? `Player profile for ${profile.user.name} on Racquet Nation.`,
  }
}

export default async function PublicPlayerPage({ params }: Props) {
  const { slug } = await params
  const profile = await prisma.playerProfile.findUnique({
    where: { slug },
    include: {
      user: { select: { name: true, avatarUrl: true, createdAt: true } },
      teamMemberships: {
        include: {
          team: {
            select: {
              name: true,
              slug: true,
              tournament: { select: { name: true, slug: true } },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!profile) notFound()

  const { user } = profile

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Avatar src={user.avatarUrl} name={user.name} size="xl" />
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-text-primary">{user.name}</h1>
          {profile.location && (
            <p className="text-sm text-text-secondary">{profile.location}</p>
          )}
          <p className="text-xs text-text-muted">
            Member since {formatDate(user.createdAt)}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {profile.selfRating && (
          <div className="rounded-lg bg-surface-raised border border-border p-3 text-center">
            <p className="text-xl font-bold text-brand-400">{profile.selfRating.toFixed(1)}</p>
            <p className="text-xs text-text-muted mt-0.5">Self Rating</p>
          </div>
        )}
        {profile.yearsPlaying && (
          <div className="rounded-lg bg-surface-raised border border-border p-3 text-center">
            <p className="text-xl font-bold text-text-primary">{profile.yearsPlaying}</p>
            <p className="text-xs text-text-muted mt-0.5">Years Playing</p>
          </div>
        )}
        <div className="rounded-lg bg-surface-raised border border-border p-3 text-center">
          <p className="text-xl font-bold text-text-primary">{profile.teamMemberships.length}</p>
          <p className="text-xs text-text-muted mt-0.5">Tournaments</p>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="rounded-lg bg-surface-raised border border-border p-4">
          <p className="text-sm text-text-secondary leading-relaxed">{profile.bio}</p>
        </div>
      )}

      {/* Tournament history */}
      {profile.teamMemberships.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-text-primary">Tournament History</h2>
          <div className="space-y-2">
            {profile.teamMemberships.map((m) => (
              <a
                key={m.id}
                href={`/tournaments/${m.team.tournament.slug}`}
                className="flex items-center justify-between rounded-lg bg-surface-raised border border-border p-3 hover:border-brand-500/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{m.team.tournament.name}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {m.team.name}
                  </p>
                </div>
                <Badge variant={m.role === 'CAPTAIN' ? 'brand' : 'default'}>
                  {m.role}
                </Badge>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
