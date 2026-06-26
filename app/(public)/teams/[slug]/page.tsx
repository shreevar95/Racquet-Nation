import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { isTeamCaptain, canManageTournament } from '@/lib/permissions'
import { RnPageHeader } from '@/components/rn/RnPageHeader'
import { RnCard } from '@/components/rn/RnCard'
import { RnTeamTile } from '@/components/rn/RnTeamTile'
import { RnStatTile } from '@/components/rn/RnStatTile'
import { EditTeamNameButton } from '@/app/(manage)/manage/[tournamentSlug]/teams/EditTeamNameButton'
import { EditTeamAvatarButton } from '@/app/(manage)/manage/[tournamentSlug]/teams/EditTeamAvatarButton'

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

  const currentUser = await getCurrentUser()
  const canEdit = currentUser
    ? (await isTeamCaptain(currentUser.id, team.id)) || (await canManageTournament(currentUser.id, team.tournamentId))
    : false

  const standing = await prisma.standings.findFirst({
    where: { teamId: team.id },
    select: { position: true, matchesWon: true, matchesLost: true, points: true },
  })

  const captain = team.memberships.find((m) => m.role === 'CAPTAIN')?.player

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
    <div className="min-h-screen bg-paper font-nunito text-ink">
      <RnPageHeader>
        <div className="flex items-center gap-4">
          <RnTeamTile name={team.name} color={team.primaryColor} logoUrl={team.logoUrl} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-nunito text-2xl font-black text-white">{team.name}</h1>
            {captain && (
              <p className="text-sm font-bold text-white/85">Captain: {captain.user.name}</p>
            )}
            <Link href={`/tournaments/${team.tournament.slug}`} className="text-xs text-white/70 transition-colors hover:text-saffron">
              {team.tournament.name}{team.group && ` · ${team.group.name}`}
            </Link>
          </div>
        </div>
      </RnPageHeader>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {canEdit && (
          <RnCard className="flex items-center gap-3 p-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-rn-text-muted">Edit team</span>
            <EditTeamNameButton teamId={team.id} currentName={team.name} />
            <EditTeamAvatarButton
              teamId={team.id}
              teamName={team.name}
              currentLogoUrl={team.logoUrl ?? null}
              currentColor={team.primaryColor ?? null}
            />
          </RnCard>
        )}

        {/* Standing / record */}
        {standing && (
          <div className="flex gap-3">
            <RnStatTile value={`${standing.matchesWon}–${standing.matchesLost}`} label="Record" />
            <RnStatTile value={`#${standing.position}`} label="Rank" highlighted />
            <RnStatTile value={standing.points} label="Points" />
          </div>
        )}

        {/* Roster */}
        <div className="space-y-2">
          <p className="text-sm font-extrabold text-ink">Roster</p>
          <div className="space-y-1.5">
            {team.memberships.map((m) => (
              <Link key={m.id} href={`/players/${m.player.slug}`}>
                <RnCard className="rn-card-hover flex items-center gap-2.5 p-2.5">
                  <RnTeamTile name={m.player.user.name} logoUrl={m.player.user.avatarUrl} color="#19A463" size="sm" className="rounded-full" />
                  <span className="flex-1 text-sm font-bold text-ink">{m.player.user.name}</span>
                  {m.role !== 'PLAYER' && (
                    <span
                      className={
                        m.role === 'CAPTAIN'
                          ? 'rounded-full bg-saffron-tint px-2 py-0.5 text-[10px] font-extrabold uppercase text-saffron'
                          : 'rounded-full bg-paper px-2 py-0.5 text-[10px] font-extrabold uppercase text-rn-text-muted'
                      }
                    >
                      {m.role}
                    </span>
                  )}
                </RnCard>
              </Link>
            ))}
            {team.memberships.length === 0 && (
              <p className="text-sm text-rn-text-muted">No players assigned yet.</p>
            )}
          </div>
        </div>

        {/* Recent results */}
        {allResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-extrabold text-ink">Recent Results</p>
            <div className="space-y-1.5">
              {allResults.slice(0, 5).map((r, i) => (
                <Link key={i} href={`/matches/${r.matchSlug}`}>
                  <RnCard className="rn-card-hover flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          r.won
                            ? 'flex h-5 w-5 items-center justify-center rounded text-[10px] font-extrabold bg-rn-green/10 text-rn-green'
                            : 'flex h-5 w-5 items-center justify-center rounded text-[10px] font-extrabold bg-red-down/10 text-red-down'
                        }
                      >
                        {r.won ? 'W' : 'L'}
                      </span>
                      <span className="text-sm text-ink">vs {r.opponent}</span>
                    </div>
                    <span className="font-nunito text-sm font-black text-ink">
                      {r.isHome ? `${r.homeScore}–${r.awayScore}` : `${r.awayScore}–${r.homeScore}`}
                    </span>
                  </RnCard>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
