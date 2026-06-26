import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { RnPageHeader } from '@/components/rn/RnPageHeader'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { RnStatTile } from '@/components/rn/RnStatTile'
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
  const currentTeam = profile.teamMemberships[0]?.team

  return (
    <div className="min-h-screen bg-paper font-nunito text-ink">
      <RnPageHeader>
        <div className="flex items-center gap-4">
          <RnTeamTile name={user.name} logoUrl={user.avatarUrl} color="#19A463" size="xl" className="rounded-full" />
          <div className="space-y-0.5">
            <h1 className="font-nunito text-2xl font-black text-white">{user.name}</h1>
            {currentTeam && <p className="text-sm font-bold text-white/85">{currentTeam.name}</p>}
            <p className="text-xs text-white/70">
              {profile.location ? `${profile.location} · ` : ''}Member since {formatDate(user.createdAt)}
            </p>
          </div>
        </div>
      </RnPageHeader>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Stats row */}
        <div className="flex gap-3">
          {profile.selfRating != null && (
            <RnStatTile value={profile.selfRating.toFixed(1)} label="Self Rating" highlighted />
          )}
          {profile.yearsPlaying != null && (
            <RnStatTile value={profile.yearsPlaying} label="Years Playing" />
          )}
          <RnStatTile value={profile.teamMemberships.length} label="Tournaments" />
        </div>

        {/* Bio */}
        {profile.bio && (
          <RnCard className="p-4">
            <p className="text-sm leading-relaxed text-rn-text-secondary">{profile.bio}</p>
          </RnCard>
        )}

        {/* Tournament history */}
        {profile.teamMemberships.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-extrabold text-ink">Tournament History</h2>
            <div className="space-y-2">
              {profile.teamMemberships.map((m) => (
                <a
                  key={m.id}
                  href={`/tournaments/${m.team.tournament.slug}`}
                  className="block"
                >
                  <RnCard className="rn-card-hover flex items-center justify-between p-3.5">
                    <div>
                      <p className="text-sm font-bold text-ink">{m.team.tournament.name}</p>
                      <p className="mt-0.5 text-xs text-rn-text-secondary">
                        {m.team.name}
                      </p>
                    </div>
                    <span
                      className={
                        m.role === 'CAPTAIN'
                          ? 'rounded-full bg-saffron-tint px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-saffron'
                          : 'rounded-full bg-paper px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-rn-text-muted'
                      }
                    >
                      {m.role}
                    </span>
                  </RnCard>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
